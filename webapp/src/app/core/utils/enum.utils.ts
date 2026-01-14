import { ItemInterface } from '../interfaces/item.interface';

export class EnumUtils {
  static getItems(enumType: any): ItemInterface[] {
    return Object.keys(enumType).map(key => ({
      id: enumType[key],
      label: key
    }));
  }
}
