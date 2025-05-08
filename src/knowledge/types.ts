export type KnowledgeAction =
  | "add-knowledge"
  | "search"
  | "use-knowledge-source"
  | "refresh-knowledge-source"
  | "share-knowledge-source";

export type KnowledgeActionConfig = {
  action: KnowledgeAction;
  knowledgeSourceId?: string;
  successMessage?: string;
};
