// data/realItems.ts
export type SeedItem = { name: string; tags?: string[]; };

export const REAL_ITEMS: SeedItem[] = [
  // Atıştırmalık / Gıda
  { name: 'Ülker Çikolatalı Gofret', tags: ['gıda','atıştırmalık','klasik'] },
  { name: 'Eti Cin', tags: ['gıda','atıştırmalık'] },
  { name: 'Ülker Albeni' },
  { name: 'Nestlé Damak' },
  { name: 'Tadım Karışık Kuruyemiş' },
  { name: 'Coca-Cola Zero Sugar', tags: ['içecek'] },
  { name: 'Ayran (Sütaş)' },
  { name: 'Uludağ Gazoz' },
  { name: 'Banvit Tavuk Burger' },
  { name: 'Komili Riviera Zeytinyağı' },

  // Film / Dizi
  { name: 'Inception', tags: ['film','nolan'] },
  { name: 'The Dark Knight', tags: ['film'] },
  { name: 'Interstellar', tags: ['film'] },
  { name: 'Fight Club', tags: ['film'] },
  { name: 'The Social Network' },
  { name: 'Parasite', tags: ['film'] },
  { name: 'Bir Zamanlar Anadolu’da', tags: ['film','nuri bilge ceylan'] },
  { name: 'Gibi (Dizi)', tags: ['dizi'] },
  { name: 'Leyla ile Mecnun', tags: ['dizi'] },
  { name: 'Succession', tags: ['dizi'] },

  // Mekan / Spesifik
  { name: 'Kadıköy Gaff Bar', tags: ['bar','mekan'] },
  { name: 'Kadıköy Gaff Bar tuvaleti', tags: ['bar','mekan','spesifik'] },
  { name: 'Bebek Starbucks sahil', tags: ['kafe','mekan'] },
  { name: 'Moda Sahili', tags: ['sahil','mekan'] },
  { name: 'Galata Kulesi terası' },
  { name: 'Karaköy Lokantası' },
  { name: 'Bursa İskender' },
  { name: 'Nusr-Et Etiler' },
  { name: 'Kuruçeşme Arena' },

  // Uygulama / Servis
  { name: 'Spotify', tags: ['uygulama'] },
  { name: 'Netflix' },
  { name: 'Google Maps' },
  { name: 'Yemeksepeti' },
  { name: 'Getir' },
  { name: 'Trendyol' },
  { name: 'Instagram' },
  { name: 'Strava' },
  { name: 'Duolingo' },

  // Gadget / Donanım
  { name: 'Apple AirPods Pro', tags: ['gadget'] },
  { name: 'Sony WH-1000XM4' },
  { name: 'Kindle Paperwhite' },
  { name: 'Logitech MX Master 3' },
  { name: 'DJI Osmo Pocket' },
  { name: 'Raspberry Pi 4' },
  { name: 'Nintendo Switch' },
  { name: 'PlayStation 5' },

  // Kahve / Yiyecek
  { name: 'V60 pour over', tags: ['kahve'] },
  { name: 'Flat white', tags: ['kahve'] },
  { name: 'Türk Kahvesi' },
  { name: 'Menemen' },
  { name: 'Mantı' },
  { name: 'Baklava' },
  { name: 'Künefe' },
  { name: 'İskender Kebap' },

  // Yerler / Deneyimler
  { name: 'Cappadocia hot air balloon sunrise', tags: ['seyahat','deneyim'] },
  { name: 'Kaş dalış noktaları' },
  { name: 'Datça Knidos antik kenti' },
  { name: 'Ayvalık Cunda gün batımı' },
  { name: 'Fethiye Kelebekler Vadisi' },

  // Oyun / Yazılım
  { name: 'The Last of Us Part II', tags: ['oyun'] },
  { name: 'Zelda: Breath of the Wild' },
  { name: 'Counter-Strike 2' },
  { name: 'Baldur’s Gate 3' },

  // Kitap
  { name: 'Kürk Mantolu Madonna', tags: ['kitap'] },
  { name: 'Suç ve Ceza' },
  { name: 'Harry Potter and the Philosopher’s Stone' },
  { name: 'İnce Memed' },

  // Restoran / Kafe (spesifik)
  { name: 'Petra Roasting Co. Gayrettepe' },
  { name: 'Norm Coffee Karaköy' },
  { name: 'Walter’s Coffee Roastery Moda' },
  { name: 'Viyana Kahvesi Kadıköy' },
  { name: 'Süt Burger - McDonald’s' },

  // Esprili/spesifik objeler
  { name: 'Boğaz vapurunda simit + çay', tags: ['deneyim','nostalji'] },
  { name: 'Üsküdar sahilde gün doğumu' },
  { name: 'Metrobüs boş koltuk' },
  { name: 'İETT akbil cihazı sesi' },
  { name: 'Kadıköy Gaff Bar müziği' },

    // Yeni eklenenler

  // Atıştırmalık / Gıda
  { name: 'Tadelle Fındıklı Gofret', tags: ['gıda','atıştırmalık'] },
  { name: 'Panda Maraş Usulü Dondurma', tags: ['gıda','tatlı'] },
  { name: 'Haribo Altın Ayıcık', tags: ['gıda','atıştırmalık'] },
  { name: 'Sek Çilekli Süt', tags: ['gıda','içecek'] },

  // Film / Dizi
  { name: 'Pulp Fiction', tags: ['film','tarantino'] },
  { name: 'The Godfather', tags: ['film','klasik'] },
  { name: 'Breaking Bad', tags: ['dizi'] },

  // Mekan / Spesifik
  { name: 'Beyoğlu Çiçek Pasajı', tags: ['mekan','restoran'] },
  { name: 'Ankara Kocatepe Camii', tags: ['mekan','turistik'] },
  { name: 'İstiklal Caddesi tramvay', tags: ['mekan','nostalji'] },

  // Uygulama / Servis
  { name: 'WhatsApp', tags: ['uygulama','mesajlaşma'] },
  { name: 'YouTube', tags: ['uygulama','video'] },
  { name: 'Twitter', tags: ['uygulama','sosyal medya'] },

  // Gadget / Donanım
  { name: 'GoPro HERO11 Black', tags: ['gadget','kamera'] },
  { name: 'Samsung Galaxy S24 Ultra', tags: ['gadget','telefon'] },

  // Kahve / Yiyecek
  { name: 'Latte Macchiato', tags: ['kahve'] },
  { name: 'Chemex pour over', tags: ['kahve'] },

  // Yerler / Deneyimler
  { name: 'Pamukkale travertenleri', tags: ['seyahat','turistik'] },
  { name: 'Nemrut Dağı gün doğumu', tags: ['seyahat','deneyim'] },
  { name: 'Olimpos sahil kampı', tags: ['seyahat','kamp'] },

  // Oyun / Yazılım
  { name: 'Elden Ring', tags: ['oyun'] },
  { name: 'Red Dead Redemption 2', tags: ['oyun'] },

  // Kitap
  { name: '1984 - George Orwell', tags: ['kitap'] },
  { name: 'Yüzüklerin Efendisi: Yüzük Kardeşliği', tags: ['kitap','fantastik'] }
];