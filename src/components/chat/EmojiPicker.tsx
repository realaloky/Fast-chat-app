use client'

type Props = {
  onEmojiSelect: (emoji: string) => void
}

export default function EmojiPicker({ onEmojiSelect }: Props) {
  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👏', '🙏', '❤️', '🔥', '✨', '🎉', '💯', '🚀', '⭐']

  return (
    <div className="mb-3 p-3 bg-slate-700 rounded-xl grid grid-cols-8 gap-2">
      {emojis.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onEmojiSelect(emoji)}
          className="text-2xl hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
