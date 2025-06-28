export default function EditorMovie() {
	return (
		<div className="flex justify-center items-center">
			<video
				autoPlay
				className="w-auto h-auto "
				loop
				muted
				playsInline
				src="/editor-movie.mp4"
			/>
		</div>
	);
}
