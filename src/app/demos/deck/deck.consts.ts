
export const deckCodeKeywordPattern = /^(?:const|let|var|function|return|if|else|for|while|new|class|extends|true|false|null|undefined|this)$/;
export const deckCodeStringPattern = /^(?:`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')$/;
export const deckCodePunctuationPattern = /^[{}()[\];,.=>]+$/;
export const deckCodeTokenPattern = /`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\.[A-Za-z_$][\w$]*|\b[A-Za-z_$][\w$]*\b|\s+|[{}()[\];,.=>]+|./g;
