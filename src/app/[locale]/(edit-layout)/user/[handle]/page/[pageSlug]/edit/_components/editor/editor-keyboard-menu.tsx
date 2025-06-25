import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  List,
  ListOrdered,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { handleFileUpload } from './use-file-upload';

interface EditorKeyboardMenuProps {
  editor: TiptapEditor;
}

const editorCommands: Record<string, (editor: TiptapEditor) => boolean> = {
  indent: (editor) => editor.chain().focus().sinkListItem('listItem').run(),
  outdent: (editor) => editor.chain().focus().liftListItem('listItem').run(),
  code: (editor) => editor.chain().focus().toggleCode().run(),
  codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  regularText: (editor) => editor.chain().focus().setParagraph().run(),
  h2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  h3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  h4: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
  blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
};

export function EditorKeyboardMenu({ editor }: EditorKeyboardMenuProps) {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const updateHandler = () => {
      setActiveStates({
        h2: editor.isActive('heading', { level: 2 }),
        h3: editor.isActive('heading', { level: 3 }),
        h4: editor.isActive('heading', { level: 4 }),
        code: editor.isActive('code'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        indent: false,
        outdent: false,
      });
    };

    updateHandler();
    editor.on('update', updateHandler);
    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor]);

  const items = [
    {
      value: 'indent',
      label: 'Indent',
      icon: IndentIncrease,
      isActive: () => editor.isActive('indent'),
    },
    {
      value: 'outdent',
      label: 'Outdent',
      icon: IndentDecrease,
      isActive: () => editor.isActive('outdent'),
    },
    {
      value: 'h2',
      label: 'Heading 2',
      icon: Heading2,
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      value: 'h3',
      label: 'Heading 3',
      icon: Heading3,
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      value: 'h4',
      label: 'Heading 4',
      icon: Heading4,
      isActive: () => editor.isActive('heading', { level: 4 }),
    },
    {
      value: 'code',
      label: 'Code',
      icon: Code,
      isActive: () => editor.isActive('code'),
    },
    {
      value: 'bulletList',
      label: 'Bullet List',
      icon: List,
      isActive: () => editor.isActive('bulletList'),
    },
    {
      value: 'orderedList',
      label: 'Ordered List',
      icon: ListOrdered,
      isActive: () => editor.isActive('orderedList'),
    },
  ];

  return (
    <>
      <footer className="sticky bottom-0 h-[48px] w-full border-border border-t bg-background md:hidden">
        {items.map(({ value, icon: Icon, isActive, label }) => (
          <button
            className={cn(
              'inline-flex h-[48px] touch-manipulation items-center justify-center rounded-md px-2 text-muted-foreground text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'active:bg-secondary active:text-foreground',
              (isActive() || activeStates[value]) &&
                'bg-secondary text-foreground'
            )}
            key={value}
            onClick={(e) => {
              e.preventDefault();
              editorCommands[value](editor);
              setActiveStates((prev) => ({
                ...prev,
                [value]: !prev[value],
              }));
            }}
            onMouseDown={(e) => e.preventDefault()}
            title={label}
            type="button"
          >
            <Icon className="h-6 w-6" />
          </button>
        ))}
        <button
          className={cn(
            'inline-flex h-[48px] touch-manipulation items-center justify-center rounded-md px-1 text-muted-foreground text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'active:bg-secondary active:text-foreground'
          )}
          onClick={() =>
            document.getElementById('keyboardImageUpload')?.click()
          }
          title="Insert Image"
          type="button"
        >
          <ImageIcon className="h-6 w-6" />
        </button>
      </footer>
      <input
        accept="image/*"
        id="keyboardImageUpload"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file, editor);
          }
        }}
        style={{ display: 'none' }}
        type="file"
      />
    </>
  );
}
