// src/utils/compressContentImage.js

const DEFAULT_OPTIONS = {
  maxWidth: 1600,
  maxHeight: 1200,

  // WebP ofrece normalmente muy buena relación calidad/peso
  type: "image/webp",

  // Calidad inicial
  quality: 0.84,

  // Intentaremos quedar por debajo de ~500 KB
  targetSizeKB: 500,

  // No seguiremos reduciendo calidad indefinidamente
  minQuality: 0.68,

  // Reducción de calidad entre intentos
  qualityStep: 0.04,

  // Protección para el navegador
  maxOriginalSizeMB: 15,
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 KB";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "No se pudo generar la imagen optimizada."
            )
          );
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error(
          "No se pudo leer la imagen seleccionada."
        )
      );
    };

    image.src = url;
  });
}

function calculateDimensions(
  width,
  height,
  maxWidth,
  maxHeight
) {
  let newWidth = width;
  let newHeight = height;

  // Nunca agrandar imágenes pequeñas
  const scale = Math.min(
    maxWidth / width,
    maxHeight / height,
    1
  );

  newWidth = Math.round(width * scale);
  newHeight = Math.round(height * scale);

  return {
    width: newWidth,
    height: newHeight,
  };
}

function createWebPFile(blob, originalName) {
  const baseName =
    originalName.replace(/\.[^/.]+$/, "") ||
    "imagen";

  return new File(
    [blob],
    `${baseName}.webp`,
    {
      type: "image/webp",
      lastModified: Date.now(),
    }
  );
}

export async function compressContentImage(
  file,
  customOptions = {}
) {
  if (!file) {
    throw new Error(
      "No se seleccionó ninguna imagen."
    );
  }

  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Formato no permitido. Utiliza JPG, PNG o WebP."
    );
  }

  const maxBytes =
    options.maxOriginalSizeMB *
    1024 *
    1024;

  if (file.size > maxBytes) {
    throw new Error(
      `La imagen supera el límite de ${options.maxOriginalSizeMB} MB.`
    );
  }

  const image = await loadImage(file);

  const originalWidth =
    image.naturalWidth || image.width;

  const originalHeight =
    image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    throw new Error(
      "No se pudieron determinar las dimensiones de la imagen."
    );
  }

  const dimensions = calculateDimensions(
    originalWidth,
    originalHeight,
    options.maxWidth,
    options.maxHeight
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Tu navegador no permite procesar esta imagen."
    );
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    0,
    0,
    dimensions.width,
    dimensions.height
  );

  const targetBytes =
    options.targetSizeKB * 1024;

  let quality = options.quality;

  let blob = await canvasToBlob(
    canvas,
    options.type,
    quality
  );

  /*
   * Si todavía pesa demasiado,
   * bajamos gradualmente la calidad.
   */
  while (
    blob.size > targetBytes &&
    quality > options.minQuality
  ) {
    quality = Math.max(
      options.minQuality,
      quality - options.qualityStep
    );

    blob = await canvasToBlob(
      canvas,
      options.type,
      quality
    );

    if (quality <= options.minQuality) {
      break;
    }
  }

  const optimizedFile = createWebPFile(
    blob,
    file.name
  );

  const savedBytes =
    file.size - optimizedFile.size;

  const reductionPercent =
    file.size > 0
      ? Math.max(
          0,
          (savedBytes / file.size) * 100
        )
      : 0;

  return {
    file: optimizedFile,

    original: {
      name: file.name,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      width: originalWidth,
      height: originalHeight,
      type: file.type,
    },

    optimized: {
        name: optimizedFile.name,
        size: optimizedFile.size,
        sizeFormatted: formatBytes(
        optimizedFile.size
        ),
        width: dimensions.width,
        height: dimensions.height,
        type: optimizedFile.type,
        quality: Number(quality.toFixed(2)),
    },

    reductionPercent: Number(
        reductionPercent.toFixed(1)
    ),
    };
}