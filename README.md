# MultiMedia Source Add-on

MultiMedia v38 için Stremio uyumlu kaynak eklentisi başlangıcı. Bu sürüm (0.2.0) API sözleşmesini, kaynak listesi uç noktasını ve otomatik testleri içerir; henüz dokuz sitenin gerçek arama/oynatma adapter'larını içermez.

## Uç noktalar
- `GET /manifest.json`: Stremio manifesti
- `GET /stream/{movie|series}/{id}.json`: kayıtlı, doğrudan HTTP(S) medya URL'si veya desteklenen infoHash içeren akışları döndürür
- `GET /meta/{movie|series}/{id}.json`: isteğe bağlı metadata
- `GET /sources.json`: dokuz kaynak adı, ana sayfa adresi ve adapter durumu
- `GET /health`: servis kontrolü

Her stream'in `name`, `title` ve `description` alanlarında kaynak adı korunur. Böylece istemci bu alanları gösterdiğinde sonuçlar “Link 1” yerine gerçek kaynak adıyla ayrılabilir.

## Çalıştırma ve test
Node.js 18+ gerekir.

```sh
npm install
npm test
npm start
```

Ardından `http://localhost:7000/health`, `/manifest.json` ve `/sources.json` uç noktalarını açın.

## Gerçek stream ekleme
`data/streams.json` içine yalnızca kullanma ve dağıtma izniniz olan doğrudan medya URL'lerini ekleyin. Örnek şema:

```json
{
  "movie:tt1234567": [
    {
      "provider": "Resmî Kaynak Adı",
      "url": "https://example.org/authorized-video.m3u8",
      "title": "1080p · Türkçe altyazı",
      "description": "Yetkili doğrudan akış"
    }
  ]
}
```

Bu URL yalnızca örnek şemadır; gerçek yayın değildir. Kaynaklar listesi `sources.json` dosyasındadır ve mevcut durumda tüm kaynakların durumu `adapter-needed` olarak kalır. Bu, kaynakların çalıştığı iddiası değildir.

## Dağıtım
`render.yaml` Render Web Service için başlangıç ayarını içerir. HTTPS servis adresini aldıktan sonra MultiMedia'nın eklenti yöneticisine `https://SENIN-SERVISIN/manifest.json` adresini ekleyin. Yerel `localhost` adresi TV'den erişilemez.

Bu iskelet DRM, oturum/erişim kontrollerini aşmaz ve korumalı oynatıcıdan bağlantı çıkarmaya çalışmaz. Gerçek adapter'lar yalnızca erişim ve kullanım koşullarının izin verdiği kaynaklar için ayrıca geliştirilmelidir.
