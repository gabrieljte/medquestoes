const rank={'Livro digital':0,Resumo:1,'Mapa mental':2,Slides:3,PDF:4};
export function withModuleMaterials(block,catalog){
  const materials=block.materialUrls||[block.url,block.secondaryUrl].filter(Boolean);
  const entries=(block.memberIds||[block.id]).map(id=>catalog.blocks[id]).filter(entry=>entry&&entry.sourceUrls.every(url=>materials.includes(url)));
  const seen=new Set(),pdfs=[];
  if(!entries.length&&block.pdfUrl)pdfs.push({id:'custom-'+block.id,title:block.title,url:block.pdfUrl,type:'PDF',size:0});
  for(const entry of entries)for(const pdf of entry.pdfs){
    const key=pdf.title.toLowerCase().replace(/\s*\(\d+\)(?=\.pdf$)/,'')+'|'+pdf.size;
    if(!seen.has(key)){seen.add(key);pdfs.push(pdf)}
  }
  pdfs.sort((a,b)=>(rank[a.type]??4)-(rank[b.type]??4)||a.title.localeCompare(b.title,'pt-BR',{numeric:true}));
  return {...block,pdfs,materialsCatalogued:entries.length>0};
}
