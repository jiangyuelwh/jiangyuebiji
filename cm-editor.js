import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { undo, redo } from "@codemirror/commands";

export function createEditor(parent, content, onUpdate) {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      markdown(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onUpdate) onUpdate(update.state.doc.toString());
      }),
    ],
  });
  const view = new EditorView({ state, parent });
  return view;
}

export function getContent(view) {
  return view.state.doc.toString();
}

export function setContent(view, content) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
}

export function undoEdit(view) {
  undo(view);
}

export function redoEdit(view) {
  redo(view);
}
