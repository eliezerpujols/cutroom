import test from 'node:test';
import assert from 'node:assert/strict';
import {fontPickerOptions,fontCategory,fontLabel,fontCategories} from '../src/fonts';
test('font groups are alphabetical with no duplicated bundled or cached families',()=>{
 const result=fontPickerOptions({installed:['Lora','Lora','Inter','Bebas Neue'],value:'Lora'});
 const labels=result.map(font=>fontLabel(font.family));assert.equal(new Set(labels).size,labels.length);
 for(const local of [true,false]){const names=result.filter(font=>font.local===local).map(font=>fontLabel(font.family));assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true})));}
 assert.equal(result.find(font=>font.family==='Lora')?.local,true);assert.equal(result.find(font=>font.family==='Inter Variable')?.local,true);
});
test('category and search filters combine for installed fonts and Google fonts',()=>{
 for(const [category] of fontCategories){const result=fontPickerOptions({category,installed:['Lora','Bebas Neue']});assert.ok(result.length);if(category!=='All')assert.ok(result.every(font=>fontCategory(font.family)===category));}
 assert.equal(fontCategory('Inter Variable'),'Sans Serif');assert.equal(fontCategory('Peacock'),'Display');
 const matches=fontPickerOptions({category:'Serif',query:'  LoRa  ',installed:['Lora']});assert.equal(matches[0].family,'Lora');assert.ok(matches.every(font=>font.family.toLowerCase().includes('lora')&&fontCategory(font.family)==='Serif'));
 assert.equal(fontPickerOptions({category:'Monospace',query:'Lora'}).length,0);
 assert.ok(fontPickerOptions({category:'Display',query:'abril'}).some(font=>font.family==='Abril Fatface'));
});
