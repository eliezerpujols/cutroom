// Google Fonts' public catalog backs fonts.google.com. Keep a checked-in snapshot
// so the picker does not require an API key or a network request to search.
import fs from 'node:fs/promises';
const source='https://fonts.google.com/metadata/fonts';
const response=await fetch(source);if(!response.ok)throw new Error('Google Fonts catalog unavailable');
const data=await response.json();
const families=data.familyMetadataList.filter(f=>f.isOpenSource).map(f=>({family:f.family,category:f.category,variants:Object.keys(f.fonts),rank:f.popularity})).sort((a,b)=>a.family.localeCompare(b.family));
if(families.length<1000)throw new Error('Incomplete Google Fonts catalog');
await fs.writeFile(new URL('../src/google-fonts.json',import.meta.url),JSON.stringify({source,updatedAt:new Date().toISOString().slice(0,10),families})+'\n');
console.log(`Saved ${families.length} Google font families`);
