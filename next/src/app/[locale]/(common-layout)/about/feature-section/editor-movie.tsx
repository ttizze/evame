export default function EditorMovie() {
	return (
		<div className="flex justify-center items-center">
			<video
				src="/editor-movie.mp4"
				autoPlay
				loop
				muted
				playsInline
				className="w-full max-w-[500px] h-auto "
			/>
		</div>
	);
}
