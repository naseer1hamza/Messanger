import UTIF from "utif";

const TIFF_MIME_TYPES = ["image/tiff", "image/tif"];
const TIFF_EXTENSION_PATTERN = /\.tiff?$/i;

const isTiffFile = (file: File): boolean =>
  TIFF_MIME_TYPES.includes(file.type) || TIFF_EXTENSION_PATTERN.test(file.name);

/**
 * Browsers (other than Safari) can't render TIFF images in an <img> tag,
 * so a raw .tif upload would preview/display as a broken image. Decode it
 * client-side and re-encode as PNG so the file is safe to preview/store.
 */
const convertTiffToPng = async (file: File): Promise<File> => {
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (ifds.length === 0) throw new Error("Couldn't read this TIFF file.");

  const ifd = ifds[0];
  UTIF.decodeImage(buffer, ifd, ifds);
  const rgba = UTIF.toRGBA8(ifd);

  const canvas = document.createElement("canvas");
  canvas.width = ifd.width;
  canvas.height = ifd.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't convert this TIFF file.");

  const imageData = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);
  context.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't convert this TIFF file.");

  const newName = file.name.replace(TIFF_EXTENSION_PATTERN, "") + ".png";
  return new File([blob], newName, { type: "image/png" });
};

/**
 * Ensures a user-selected image is safe to preview/upload in the browser,
 * converting unsupported formats (currently just TIFF) to PNG first.
 */
export const ensureWebSafeImage = async (file: File): Promise<File> => {
  if (isTiffFile(file)) return convertTiffToPng(file);
  return file;
};
