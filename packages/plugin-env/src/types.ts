export interface SerializableObject {
  [key: string]: string | number | boolean | SerializableObject;
}
