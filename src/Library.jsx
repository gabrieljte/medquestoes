import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteLibraryImage,
  listLibraryImages,
  saveLibraryImage
} from "./libraryDb.js";
import {
  deleteCloudLibraryImage,
  queueLibraryDeletion,
  syncLibraryImages,
  uploadLibraryImage
} from "./libraryCloud.js";
import { updateLibraryMetadata } from "./libraryCloud.js";
import { readableSyncError } from "./accountSync.js";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function isVideo(item) {
  return String(item?.mimeType || item?.image?.type || "").startsWith("video/");
}

function mediaLabel(item) {
  return isVideo(item) ? "Vídeo" : "Imagem";
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readableError(error, fallback) {
  if (error?.name === "QuotaExceededError") {
    return "O espaço reservado para a biblioteca neste navegador está cheio.";
  }

  return error?.message || fallback;
}

export default function Library({ areas = [], userId = "" }) {
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [viewer, setViewer] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editingBusy, setEditingBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableAreas = useMemo(() => {
    const source = Array.isArray(areas) ? areas : Object.keys(areas || {});
    const values = source
      .map(item => {
        if (typeof item === "string") return item;
        return item?.name || item?.area || item?.label || "";
      })
      .map(item => item.trim())
      .filter(Boolean);

    return [...new Set(values)].sort((first, second) =>
      first.localeCompare(second, "pt-BR")
    );
  }, [areas]);

  const filterAreas = useMemo(() => {
    const savedAreas = images.map(item => item.area).filter(Boolean);
    return [...new Set([...availableAreas, ...savedAreas])].sort((first, second) =>
      first.localeCompare(second, "pt-BR")
    );
  }, [availableAreas, images]);

  const visibleImages = useMemo(() => {
    const query = normalizeText(search.trim());

    return images.filter(item => {
      const matchesArea = areaFilter === "Todas" || item.area === areaFilter;
      const haystack = normalizeText(
        `${item.description || ""} ${item.area || ""} ${item.fileName || ""}`
      );
      const matchesType = typeFilter === "Todos" || (typeFilter === "Vídeos" ? isVideo(item) : !isVideo(item));
      return matchesArea && matchesType && (!query || haystack.includes(query));
    });
  }, [areaFilter, images, search, typeFilter]);

  useEffect(() => {
    setArea(current =>
      current && availableAreas.includes(current)
        ? current
        : (availableAreas[0] || "")
    );
  }, [availableAreas]);

  useEffect(() => {
    let active = true;

    const refresh = () => (userId ? syncLibraryImages(userId) : listLibraryImages())
      .then(records => {
        if (active) setImages(records);
      })
      .catch(loadError => {
        if (active) {
          setError(userId ? readableSyncError(loadError) : readableError(loadError, "Não foi possível abrir a biblioteca."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    refresh();
    const reconnect = () => refresh();
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    return () => {
      active = false;
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", reconnect);
    };
  }, [userId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [file]);

  useEffect(() => {
    const nextUrls = {};

    images.forEach(item => {
      if (item.image instanceof Blob) {
        nextUrls[item.id] = URL.createObjectURL(item.image);
      }
    });

    setImageUrls(nextUrls);

    return () => {
      Object.values(nextUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    clearFeedback();

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validType = selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/");
    if (!validType) {
      setFile(null);
      event.target.value = "";
      setError("Escolha uma imagem ou um vídeo válido.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setFile(null);
      event.target.value = "";
      setError("O arquivo deve ter no máximo 50 MB.");
      return;
    }

    setFile(selectedFile);
  }

  function resetForm() {
    setFile(null);
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFeedback();

    if (!file) {
      setError("Selecione uma imagem ou um vídeo para adicionar.");
      return;
    }

    if (!area) {
      setError("Selecione a especialidade do arquivo.");
      return;
    }

    if (!description.trim()) {
      setError("Escreva uma breve descrição do arquivo.");
      return;
    }

    const record = {
      id: makeId(),
      area,
      description: description.trim(),
      image: file,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    };

    setSaving(true);
    let locallySaved = false;

    try {
      await saveLibraryImage(record);
      locallySaved = true;
      let savedRecord = record;
      if (userId) {
        savedRecord = await uploadLibraryImage(record, userId);
        await saveLibraryImage(savedRecord);
      }
      setImages(current => [savedRecord, ...current]);
      resetForm();
      setMessage(userId ? `${mediaLabel(record)} salvo e sincronizado pelo Supabase.` : `${mediaLabel(record)} salvo neste dispositivo.`);
    } catch (saveError) {
      if (locallySaved) {
        setImages(current => current.some(item => item.id === record.id) ? current : [record, ...current]);
        resetForm();
      }
      const detail = /mime|maximum allowed size|exceeded.*size/i.test(String(saveError?.message || ""))
        ? "O armazenamento da conta ainda precisa ser habilitado para vídeos."
        : readableSyncError(saveError);
      setError(locallySaved ? `${detail} O arquivo ficou salvo neste dispositivo e será reenviado ao reconectar ou reabrir a Biblioteca.` : readableError(saveError, "Não foi possível salvar o arquivo."));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing || editingBusy || !editing.area || !editing.description.trim()) return;
    setEditingBusy(true);
    clearFeedback();
    const original = images.find(item => item.id === editing.id);
    const record = { ...original, area: editing.area, description: editing.description.trim(), updatedAt: new Date().toISOString(), metadataPending: true };
    let locallySaved = false;
    try {
      await saveLibraryImage(record);
      locallySaved = true;
      setImages(items => items.map(item => item.id === record.id ? record : item));
      setViewer(item => item?.id === record.id ? record : item);
      if (userId) {
        const synced = await updateLibraryMetadata(record, userId);
        await saveLibraryImage(synced);
        setImages(items => items.map(item => item.id === record.id ? synced : item));
      }
      setEditing(null);
      setMessage(userId ? "Alterações salvas e sincronizadas." : "Alterações salvas neste dispositivo.");
    } catch (editError) {
      if (locallySaved) setEditing(null);
      setError(locallySaved ? "Alterações salvas neste dispositivo. A sincronização será tentada ao reconectar ou reabrir a Biblioteca." : readableError(editError, "Não foi possível salvar as alterações."));
    } finally {
      setEditingBusy(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Excluir este ${mediaLabel(item).toLocaleLowerCase("pt-BR")} de ${item.area}? Esta ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    clearFeedback();
    setDeletingId(item.id);
    let cloudDeleteFailed = false;

    try {
      if (userId) {
        try {
          await deleteCloudLibraryImage(item, userId);
        } catch (cloudError) {
          cloudDeleteFailed = true;
          queueLibraryDeletion(item);
          setError(`${readableSyncError(cloudError)} A exclusão será concluída ao reconectar.`);
        }
      }
      await deleteLibraryImage(item.id);
      setImages(current => current.filter(image => image.id !== item.id));
      setViewer(current => current?.id === item.id ? null : current);
      if (!cloudDeleteFailed) setMessage(`${mediaLabel(item)} excluído da biblioteca.`);
    } catch (deleteError) {
      setError(readableError(deleteError, "Não foi possível excluir a imagem."));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="library-page">
      <div className="library-heading">
        <div>
          <span className="library-eyebrow">ACERVO PESSOAL</span>
          <h1>Biblioteca multimídia</h1>
          <p>
            Guarde imagens, exames e vídeos importantes organizados por especialidade.
          </p>
        </div>
        <div className="library-total">
          <b>{images.length}</b>
          <span>{images.length === 1 ? "item salvo" : "itens salvos"}</span>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`library-feedback ${error ? "is-error" : "is-success"}`}
          role={error ? "alert" : "status"}
        >
          <span>{error ? "!" : "✓"}</span>
          <p>{error || message}</p>
          <button type="button" onClick={clearFeedback} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}

      <div className="library-layout">
        <aside className="library-upload-card">
          <div className="library-panel-title">
            <span className="library-panel-icon">＋</span>
            <div>
              <h2>Adicionar mídia</h2>
              <p>Preencha os dados para guardar no acervo.</p>
            </div>
          </div>

          <form className="library-form" onSubmit={handleSubmit}>
            <label
              className={`library-file-picker ${previewUrl ? "has-preview" : ""}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <>
                  {file?.type.startsWith("video/") ? (
                    <video src={previewUrl} controls muted playsInline aria-label="Pré-visualização do vídeo selecionado" />
                  ) : (
                    <img src={previewUrl} alt="Pré-visualização da imagem selecionada" />
                  )}
                  <span className="library-replace-image">Trocar arquivo</span>
                </>
              ) : (
                <span className="library-file-empty">
                  <b>↑</b>
                  <strong>Escolher foto ou vídeo</strong>
                  <small>Imagens e vídeos de até 50 MB. Prefira MP4 para assistir no celular.</small>
                </span>
              )}
            </label>

            {file && (
              <div className="library-file-meta">
                <span>{file.name}</span>
                <small>{formatFileSize(file.size)}</small>
              </div>
            )}

            <label className="library-field">
              <span>Especialidade</span>
              <select
                value={area}
                onChange={event => setArea(event.target.value)}
                disabled={!availableAreas.length}
                required
              >
                {!availableAreas.length && (
                  <option value="">Nenhuma especialidade disponível</option>
                )}
                {availableAreas.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="library-field">
              <span>Descrição</span>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Ex.: Radiografia com consolidação ou aula sobre exame neurológico..."
                rows={4}
                maxLength={600}
                required
              />
              <small>{description.length}/600</small>
            </label>

            <button
              className="library-save-button"
              type="submit"
              disabled={saving || !availableAreas.length}
            >
              {saving ? "Salvando..." : "Salvar na biblioteca"}
            </button>
          </form>
        </aside>

        <div className="library-collection">
          <div className="library-toolbar">
            <label className="library-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por descrição ou arquivo..."
                aria-label="Buscar itens da biblioteca"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              )}
            </label>

            <label className="library-filter">
              <span>Tipo</span>
              <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                <option value="Todos">Todos</option>
                <option value="Imagens">Imagens</option>
                <option value="Vídeos">Vídeos</option>
              </select>
            </label>

            <label className="library-filter">
              <span>Especialidade</span>
              <select
                value={areaFilter}
                onChange={event => setAreaFilter(event.target.value)}
              >
                <option value="Todas">Todas</option>
                {filterAreas.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="library-results-title">
            <h2>Seu acervo</h2>
            <span>
              {visibleImages.length}{" "}
              {visibleImages.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>

          {loading ? (
            <div className="library-state library-loading" role="status">
              <span className="library-spinner" />
              <h3>Abrindo sua biblioteca...</h3>
              <p>{userId ? "Sincronizando seu acervo com a conta..." : "Os arquivos estão disponíveis neste dispositivo."}</p>
            </div>
          ) : visibleImages.length ? (
            <div className="library-grid">
              {visibleImages.map(item => (
                <article className="library-image-card" key={item.id}>
                  <button
                    className="library-card-preview"
                    type="button"
                    onClick={() => setViewer(item)}
                    aria-label={`Abrir ${mediaLabel(item).toLocaleLowerCase("pt-BR")}: ${item.description}`}
                  >
                    {imageUrls[item.id] ? (
                      isVideo(item) ? (
                        <video src={imageUrls[item.id]} muted playsInline preload="metadata" />
                      ) : (
                        <img src={imageUrls[item.id]} alt={item.description || `Imagem de ${item.area}`} loading="lazy" />
                      )
                    ) : (
                      <span className="library-image-placeholder">{mediaLabel(item)}</span>
                    )}
                    {isVideo(item) && <span className="library-play-icon" aria-hidden="true">▶</span>}
                    <span className="library-expand-icon" aria-hidden="true">↗</span>
                  </button>

                  <div className="library-card-body">
                    <div className="library-card-topline">
                      <div><span className="library-area-badge">{item.area}</span><span className="library-type-badge">{mediaLabel(item)}</span></div>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="library-card-footer">
                      <button type="button" className="library-edit-button" onClick={() => setEditing({ id: item.id, area: item.area, description: item.description || "" })}>Editar</button>
                      <span title={item.fileName}>{item.fileName || mediaLabel(item)}</span>
                      <button
                        type="button"
                        className="library-delete-button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        aria-label={`Excluir ${mediaLabel(item).toLocaleLowerCase("pt-BR")}: ${item.description}`}
                      >
                        {deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-state library-empty">
              <span className="library-empty-icon" aria-hidden="true">▧</span>
              <h3>
                {images.length
                  ? "Nenhum item corresponde aos filtros"
                  : "Sua biblioteca ainda está vazia"}
              </h3>
              <p>
                {images.length
                  ? "Tente outra busca ou selecione todas as especialidades."
                  : "Adicione a primeira imagem ou vídeo usando o formulário ao lado."}
              </p>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setAreaFilter("Todas");
                    setTypeFilter("Todos");
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="library-viewer-backdrop" role="dialog" aria-modal="true" aria-labelledby="library-edit-title">
          <form className="library-viewer library-edit-dialog" onSubmit={saveEdit} onKeyDown={event => { if (event.key === "Escape" && !editingBusy) setEditing(null); }}>
            <h2 id="library-edit-title">Editar item da biblioteca</h2>
            <label className="library-field"><span>Especialidade</span><select value={editing.area} onChange={event => setEditing(item => ({ ...item, area: event.target.value }))} disabled={editingBusy} required>{filterAreas.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="library-field"><span>Descrição</span><textarea autoFocus rows={6} maxLength={600} value={editing.description} onChange={event => setEditing(item => ({ ...item, description: event.target.value }))} disabled={editingBusy} required /></label>
            <div className="library-edit-actions"><button type="button" className="library-edit-button" disabled={editingBusy} onClick={() => setEditing(null)}>Cancelar</button><button className="library-save-button" disabled={editingBusy || !editing.description.trim()}>{editingBusy ? "Salvando…" : "Salvar alterações"}</button></div>
          </form>
        </div>
      )}

      {viewer && (
        <div
          className="library-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização de ${mediaLabel(viewer).toLocaleLowerCase("pt-BR")}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) setViewer(null);
          }}
        >
          <div className="library-viewer">
            <button
              className="library-viewer-close"
              type="button"
              onClick={() => setViewer(null)}
              aria-label="Fechar visualização"
            >
              ×
            </button>
            {imageUrls[viewer.id] && (isVideo(viewer) ? (
              <video src={imageUrls[viewer.id]} controls playsInline preload="metadata" />
            ) : (
              <img src={imageUrls[viewer.id]} alt={viewer.description || `Imagem de ${viewer.area}`} />
            ))}
            <div className="library-viewer-caption">
              <span className="library-area-badge">{viewer.area}</span> <span className="library-type-badge">{mediaLabel(viewer)}</span>
              <p>{viewer.description}</p>
              <small>{viewer.fileName}</small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
