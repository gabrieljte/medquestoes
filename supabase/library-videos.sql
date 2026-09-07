-- Habilita vídeos no acervo existente, preservando arquivos e permissões.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mpeg'
    ]
where id = 'library-images';
