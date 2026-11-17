import { mergeAttributes, Node } from "@tiptap/core";
import { normalizeCalloutTone, type CalloutTone } from "./callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (tone?: CalloutTone) => ReturnType;
      setCalloutTone: (tone: CalloutTone) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * Blok sorotan editorial (<aside data-callout="...">) untuk TipTap v3.
 * Dipakai penulis artikel untuk menandai catatan penting, tips, atau peringatan
 * tanpa mencampur HTML bebas.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info" as CalloutTone,
        parseHTML: (element) =>
          normalizeCalloutTone(element.getAttribute("data-callout")),
        renderHTML: (attributes) => ({
          "data-callout": normalizeCalloutTone(attributes.tone),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleCallout:
        (tone = "info") =>
        ({ commands, editor }) => {
          const safeTone = normalizeCalloutTone(tone);
          if (editor.isActive(this.name)) {
            const current = normalizeCalloutTone(
              editor.getAttributes(this.name).tone,
            );
            if (current === safeTone) {
              return commands.lift(this.name);
            }
            return commands.updateAttributes(this.name, { tone: safeTone });
          }
          return commands.wrapIn(this.name, { tone: safeTone });
        },
      setCalloutTone:
        (tone) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            tone: normalizeCalloutTone(tone),
          }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
