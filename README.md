# PALAS

PALAS, anıları ve fikirleri sonsuz bir tuvalde bir araya getiren, Türkçe başlayan cozy bir çalışma alanıdır. Demo panosu anahtarsız çalışır; pano durumu tarayıcıda saklanır ve aynı kaynağı kullanan sekmeler arasında eşitlenir.

## Başlat

```bash
npm install
npm run dev
```

Geliştirme sunucusu `http://localhost:3000` adresinde açılır. Kontroller:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Bulut Bağlantısı

Supabase kullanmak isteğe bağlıdır. Proje URL’si ve anon anahtarını `.env.local` içine ekleyin; ardından [supabase/schema.sql](supabase/schema.sql) içeriğini Supabase SQL Editor’da çalıştırın. Gerekli değişkenlerin adları [.env.example](.env.example) dosyasındadır. Anahtarlar yoksa PALAS otomatik olarak yerel depolamayı kullanır.

## Etkileşimler

- Tuval kartlarını sürükleyin; not, fotoğraf, fikir tohumu, şişe mesajı, zaman kapsülü, kasa, CSV tablosu veya dosya ekleyin.
- Kürek ve UV araçlarını tuvalin sol üstündeki araç düğmelerinden açın.
- `/` ile sekmeler arası kısa sohbeti, `H` ile kalp/konfeti paylaşımını başlatın.
- Üst bardaki tema ve hava seçimlerini, alt araç çubuğundaki şablon, düzenleme ve yardımcı menülerini kullanın.
- Kasa içeriği Web Crypto AES-GCM ile PIN’den türetilen anahtarla şifrelenir.