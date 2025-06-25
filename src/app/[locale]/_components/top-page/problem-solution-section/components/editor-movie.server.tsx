export default function EditorMovie() {
  return (
    <div className="flex items-center justify-center">
      <video
        autoPlay
        className="h-auto w-auto "
        loop
        muted
        playsInline
        src="/editor-movie.mp4"
      />
    </div>
  );
}
