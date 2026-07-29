import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteLibraryImage,
  listLibraryImages,
  saveLibraryImage
} from "./libraryDb.js";

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

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readableError(error, fallback) {
  if (error?.name === "QuotaExceededError") {
    return "O espaço reservado para imagens neste navegador está cheio.";
  }

  return error?.message || fallback;
}

export default function Library({ areas = [] }) {
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [viewer, setViewer] = useState(null);
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
      return matchesArea && (!query || haystack.includes(query));
    });
  }, [areaFilter, images, search]);

  useEffect(() => {
    setArea(current =>
      current && availableAreas.includes(current)
        ? current
        : (availableAreas[0] || "")
    );
  }, [availableAreas]);

  useEffect(() => {
    let active = true;

    listLibraryImages()
      .then(records => {
        if (active) setImages(records);
      })
      .catch(loadError => {
        if (active) {
          setError(readableError(loadError, "Não foi possível abrir a biblioteca."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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

    if (!selectedFile.type.startsWith("image/")) {
      setFile(null);
      event.target.value = "";
      setError("Escolha um arquivo de imagem válido.");
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
      setError("Selecione uma imagem para adicionar.");
      return;
    }

    if (!area) {
      setError("Selecione a especialidade da imagem.");
      return;
    }

    if (!description.trim()) {
      setError("Escreva uma breve descrição da imagem.");
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

    try {
      await saveLibraryImage(record);
      setImages(current => [record, ...current]);
      resetForm();
      setMessage("Imagem salva na biblioteca.");
    } catch (saveError) {
      setError(readableError(saveError, "Não foi possível salvar a imagem."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Excluir esta imagem de ${item.area}? Esta ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    clearFeedback();
    setDeletingId(item.id);

    try {
      await deleteLibraryImage(item.id);
      setImages(current => current.filter(image => image.id !== item.id));
      setViewer(current => current?.id === item.id ? null : current);
      setMessage("Imagem excluída da biblioteca.");
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
          <h1>Biblioteca de imagens</h1>
          <p>
            Guarde achados, exames e imagens importantes organizados por
            especialidade.
          </p>
        </div>
        <div className="library-total">
          <b>{images.length}</b>
          <span>{images.length === 1 ? "imagem salva" : "imagens salvas"}</span>
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
              <h2>Adicionar imagem</h2>
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
                accept="image/*"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Pré-visualização da imagem selecionada" />
                  <span className="library-replace-image">Trocar imagem</span>
                </>
              ) : (
                <span className="library-file-empty">
                  <b>↑</b>
                  <strong>Escolher uma foto</strong>
                  <small>JPG, PNG, WEBP ou outra imagem</small>
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
                placeholder="Ex.: Radiografia com consolidação em lobo inferior direito..."
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
                aria-label="Buscar imagens"
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
              <p>As imagens ficam salvas somente neste navegador.</p>
            </div>
          ) : visibleImages.length ? (
            <div className="library-grid">
              {visibleImages.map(item => (
                <article className="library-image-card" key={item.id}>
                  <button
                    className="library-card-preview"
                    type="button"
                    onClick={() => setViewer(item)}
                    aria-label={`Ampliar imagem: ${item.description}`}
                  >
                    {imageUrls[item.id] ? (
                      <img
                        src={imageUrls[item.id]}
                        alt={item.description || `Imagem de ${item.area}`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="library-image-placeholder">Imagem</span>
                    )}
                    <span className="library-expand-icon" aria-hidden="true">↗</span>
                  </button>

                  <div className="library-card-body">
                    <div className="library-card-topline">
                      <span className="library-area-badge">{item.area}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="library-card-footer">
                      <span title={item.fileName}>{item.fileName || "Imagem"}</span>
                      <button
                        type="button"
                        className="library-delete-button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        aria-label={`Excluir imagem: ${item.description}`}
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
                  ? "Nenhuma imagem corresponde aos filtros"
                  : "Sua biblioteca ainda está vazia"}
              </h3>
              <p>
                {images.length
                  ? "Tente outra busca ou selecione todas as especialidades."
                  : "Adicione a primeira imagem usando o formulário ao lado."}
              </p>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setAreaFilter("Todas");
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {viewer && (
        <div
          className="library-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da imagem"
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
            {imageUrls[viewer.id] && (
              <img
                src={imageUrls[viewer.id]}
                alt={viewer.description || `Imagem de ${viewer.area}`}
              />
            )}
            <div className="library-viewer-caption">
              <span className="library-area-badge">{viewer.area}</span>
              <p>{viewer.description}</p>
              <small>{viewer.fileName}</small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
