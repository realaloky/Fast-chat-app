'use client'

type Props = {
  file: File
  onCancel: () => void
}

export default function ImagePreview({ file, onCancel }: Props) {
  const imageUrl = URL.createObjectURL(file)

  return (
    <div className="glass-dark border-t border-white/10 p-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
          <button
            onClick={onCancel}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-white/60">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>
    </div>
  )
}
