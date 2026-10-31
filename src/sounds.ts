export type LibrarySound={id:string;name:string;category:string;duration:number;frames:number;peaks:number[];source:string;sourceUrl?:string;url:string};
export type SoundCatalog={sounds:LibrarySound[];categories:string[];total:number;folder:string};
export const SOUND_DRAG_TYPE='application/cutroom-sound';
