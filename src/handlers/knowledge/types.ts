export type KnowledgeAction =
  | "add-knowledge"
  | "search"
  | "use-knowledge-source"
  | "refresh-knowledge-source"
  | "share-knowledge-source"
  | "list-knowledge-sources";

export type KnowledgeActionConfig = {
  action: KnowledgeAction;
  knowledgeSourceId?: string;
  successMessage?: string;
};
