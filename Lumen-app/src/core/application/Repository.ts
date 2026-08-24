export interface Repository<TEntity, TIdentifier = string> {
  findById(id: TIdentifier): Promise<TEntity | null> | TEntity | null;
  save(entity: TEntity): Promise<void> | void;
}
