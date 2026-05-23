import { useCallback, type JSX } from "react";

interface ImagePickerProps {
  readonly imageUrl: string | null;
  readonly onImageSelected: (imagePath: string, imageUrl: string) => void;
  readonly onImageRemoved: () => void;
}

export function ImagePicker({ imageUrl, onImageSelected, onImageRemoved }: ImagePickerProps): JSX.Element {
  const handleClick = useCallback(async () => {
    const result = await window.ttrpg?.openAsideImage();
    if (result?.ok) {
      const resolvedUrl = await window.ttrpg?.resolveAsideUrl(result.imagePath);
      if (resolvedUrl !== null && resolvedUrl !== undefined) {
        onImageSelected(result.imagePath, resolvedUrl);
      }
    }
  }, [onImageSelected]);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file === undefined) return;
      const path = (file as unknown as { path?: string }).path;
      if (typeof path !== "string") return;
      const resolvedUrl = await window.ttrpg?.resolveAsideUrl(path);
      if (resolvedUrl !== null && resolvedUrl !== undefined) {
        onImageSelected(path, resolvedUrl);
      }
    },
    [onImageSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        onClick={() => { void handleClick(); }}
        onDrop={(e) => { void handleDrop(e); }}
        onDragOver={handleDragOver}
        style={{
          width: 80,
          height: 80,
          border: "2px dashed #444",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          backgroundColor: "#1a1c1e",
          flexShrink: 0
        }}
      >
        {imageUrl !== null ? (
          <img
            src={imageUrl}
            alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#666", fontSize: 11, textAlign: "center", padding: 4 }}>
            Click o<br />arrastra
          </span>
        )}
      </div>
      {imageUrl !== null && (
        <button
          onClick={onImageRemoved}
          style={{
            fontSize: 11,
            color: "#888",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textAlign: "left"
          }}
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
}
