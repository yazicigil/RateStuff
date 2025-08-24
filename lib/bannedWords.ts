// lib/bannedWords.ts

export const bannedWords: string[] = [
  // Türkçe küfürler ve varyasyonları
  /*
  
  "amck","amcık","amcik","amk","a.m.k","a.m.q","amq","amına","amina","amına koy","amına koyayım","aminako","aminakoyim","aminakoy","amkoyim","a.mina","amına kodum","amına koduk","amına kodumun","amn","amına g","amınak","amınako","amına s","amına ş","aminas","amını","amın","amnı","amnım","amnın","amn","amnako","amnıko","amnk",
  "orospu","o.rospu","or0spu","or0spı","orospı","orosp","orospular","orospuluk","orospucuk","orospu çocuk","orospu çocuğu","oç","o.c","oçocuğu","oçlar","oçluk","oçsun","oçum","oçun",
  "sik","si.k","s1k","s!k","siq","sikerim","sikeyim","siktir","s!ktir","sıktir","sikm","sikmiş","siktirin","siktir git","siktir lan","sikik","siki","sikiyor","sikmişim","sikicem","sikcem","sikecem","sikem",
  "pezevenk","p.ezevenk","pezevank","pezewenk","pezev3nk","pezev","pezevengin","pezevenkler","pezevenklik","pez","peze",
  "yarrak","yarak","y@rrak","y4rrak","ya.rak","yarrağ","yarrağı","yarrağım","yarrağın","yarrağına","yarrağını","yarrağınla","yarrağınn","yarram","yarramı","yarramın","yarramla","yarro",
  "göt","g0t","got","götveren","gotveren","g0tv3r3n","götoş","gotos","götlek","götler","götün","götünü","götü","götüm","götümün","götümle","götünle","götünüz","götünüzün","götüstü",
  "ibne","ibn3","ibn","ibine","ibneler","ibnelik","ibneligin","ibneliginle","ibnemsin","ibn","ibnelersiniz","ibnelersin","ibnmisin","ibnmisiniz","ibnlik",
  "puşt","pust","pu$ht","pu$t","puştluk","puştlar","puştum","puştun","puştunuz","puştca","puştça",
  "kahpe","kahbe","kahp3","kahpeler","kahpelerle","kahpelik","kahpeligine","kahpeligini","kahpeligin","kahpemsin","kahpesin","kahpesiniz","kahpeler","kahpeleriniz",
  "piç","piq","p1ç","pich","piçler","piçlik","piçsiniz","piçsinizdir","piçsiniz lan","piçim","piçin","piçin evladı","piçin oğlu","piçin çocuğu",
  "şerefsiz","şer3fsiz","şerefsizlik","şerefsizler","şerefsizim","şerefsizsin","şerefsiniz","şerefsizleriniz","şerefsizliktir","şerefsizlik yapma",
  "haysiyetsiz","haysiyetsizlik","haysiyetsizler","haysiyetsizim","haysiyetsizsin","haysiyetsiniz","haysiyetsizliktir",
  "aptal","salak","gerizekalı","geri.zeka","geri zekalı","manyak","deli","dangalak","ahmak","yavşak","yavsak","yavş","yavşaklar","yavşaksın","yavşaksınız",
  "ensest","ens3st","i.n.c.e.s.t","incest",
  "sürtük","surtuk","sürtvk","surtvk","sürtükler","sürtüklük",
  "ananı","ananı s","ananı si","ananı s.","ananı s.k","anan","anani","ananizi","ananizi s","ananınızı","ananinizi",
  "babanı","babanı s","babanı si","babanı s.","babanı s.k","babani","babanizi","babanızı",

  // İngilizce küfürler ve varyasyonları
  "fuck","f.ck","fuk","f@ck","f*ck","fuq","fuk","fucking","f.cking","fuking","f@cking","f*cking","fuckin","fukin","fkn","fckn",
  "motherfucker","m0therfucker","motherfuker","mothafucka","m0thafucka","muthafucka","muthafuckker",
  "bitch","b1tch","b!tch","biatch","bıtch","bıtch","bitchez","bitchy","bitches","biç","biçh",
  "slut","slvt","sl@t","s1ut","skank","sk@nk","skanq","sk4nk",
  "whore","wh0re","wh0r3","whor3","whor","hore","h0re","h0r3","hoe","h0e","h03",
  "asshole","a$$hole","a.s.shole","ashole","assol","assh0le","arsehole","arshole","areshole",
  "bastard","b@stard","bastrd","bastart","basturt",
  "cunt","c*nt","kunt","qunt","qvnt","c.u.n.t","cnt",
  "dick","d1ck","d!ck","dyck","dik","diq","diqq","d!q","d!kk","d1kk",
  "pussy","pusy","pussi","p0ssy","p0ss1","pussi","pussies","pussee","pusey","pusie",
  "fag","faqq","f@ggot","fagg0t","phaggot","ph@g","phag","fagg","f4g",
  "nigger","n1gger","n!gger","nigg3r","nıgger","niger","nıger","n!ger","n1ger","niggah","nigga","n1gga","n!gga","niggaz","nigguh","niggurs",
  "retard","ret@rd","r3tard","r3t@rd","retards","retarded","retardation"

  */
];

export function containsBannedWord(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => lowerText.includes(word));
}
