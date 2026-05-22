const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedImageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const maxImageSize = 5 * 1024 * 1024;

export function validateImageUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedImageTypes.has(file.type)) {
    return "Image must be a JPEG, PNG, WebP, or GIF file.";
  }

  if (!allowedImageExtensions.has(extension)) {
    return "Image file extension is not allowed.";
  }

  if (file.size > maxImageSize) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

export function safeUploadName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  return `${cryptoSafeName(fileName)}.${extension}`;
}

function cryptoSafeName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
}
