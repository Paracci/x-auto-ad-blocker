// =============================================================================
// src/i18n/translations.js
// Shared translation engine — loaded before popup.js and content.js
//
// USAGE
//   Popup  : await i18n.init(); then i18n.t('key')  or  i18n.applyToDOM()
//   Content: await i18n.init(); then i18n.t('key')
//
// LANGUAGE RESOLUTION ORDER
//   1. chrome.storage.local → 'userLang'  (manual override, 'auto' = no override)
//   2. chrome.i18n.getUILanguage()         (browser locale)
//   3. 'en'                                (final fallback)
// =============================================================================

const SUPPORTED_LANGS = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'it', 'ru', 'ja', 'ko', 'zh'];
const DEFAULT_LANG = 'en';

// -----------------------------------------------------------------------------
// Translation table — keys must stay identical across all language objects.
// Language names (langXxx) always use the native script so users can
// recognise their own language regardless of the current UI language.
// -----------------------------------------------------------------------------
const TRANSLATIONS = {

    // ── English ───────────────────────────────────────────────────────────────
    en: {
        navHome: 'Home',
        navSettings: 'Settings',
        navBlocked: 'Blocked',
        navAbout: 'About',

        appName: 'X Ad Blocker',
        protection: 'Protection',
        statusActive: 'Active',
        statusPaused: 'Paused',
        statBlocked: 'Blocked',
        statDownloaded: 'Downloaded',
        mediaDownloader: 'Media Downloader',
        mediaDownloaderSub: 'Videos, GIFs & images',

        settingsTitle: 'Settings',
        sectionAdBlocking: 'Ad Blocking',
        settingAutoBlock: 'Auto-block advertisers',
        settingAutoBlockSub: 'Permanently blocks the account',
        settingToasts: 'Show toast notifications',
        settingToastsSub: 'Confirm when an ad is blocked',
        sectionDownloader: 'Media Downloader',
        settingDownloadBtn: 'Show download button',
        settingDownloadBtnSub: 'Inject button into every tweet',
        btnReset: 'Reset Statistics',

        sectionLanguage: 'Language',
        settingLanguage: 'Interface Language',
        settingLanguageSub: 'Override browser default',
        langAuto: 'Auto (Browser)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'About',
        aboutDesc: 'Automatically blocks advertisers on X and lets you download videos, GIFs and images — all client-side, no data collected.',
        howItWorks: 'How it works',
        howItWorksItem1: 'Detects ad labels (Ad, Promoted, Reklam) via MutationObserver',
        howItWorksItem2: 'Silently clicks Block → Confirm in the background',
        howItWorksItem3: "Uses X's Syndication API to fetch the highest-bitrate MP4",
        privacyTitle: 'Privacy',
        privacyDesc: "No data is collected or transmitted. The only external request is to cdn.syndication.twimg.com — X's own public API — and only when you click the download button.",

        blockedTitle: 'Blocked Advertisers',
        blockedNote: 'This list tracks advertisers blocked in this session. To see your full X block list, visit',
        blockedNoteLink: 'X → Settings → Blocked accounts',
        blockedEmpty: 'No advertisers blocked yet. Browse X and ads will be blocked automatically.',
        viewOnX: 'View on X',

        resetModalTitle: 'Reset Statistics',
        resetModalBody: 'This will clear all counters and the blocked advertiser history. This cannot be undone.',
        modalCancel: 'Cancel',
        modalConfirm: 'Reset',

        craftedBy: 'Crafted by',

        toastBlocked: 'Blocked:',
        toastNoTweetId: 'Could not find tweet ID.',
        toastVideoNotFound: 'Video not found (may be private or deleted).',
        toastVideoFailed: 'Failed to get video:',
        toastNoMedia: 'No downloadable media found in this post.',
        toastMediaDownloaded: 'Media downloaded ✓',
        toastMediaDownloadedMulti: 'media downloaded ✓',
        toastConverting: 'Converting GIF...',

        downloaderAriaLabel: 'Download media',
    },

    // ── Türkçe ────────────────────────────────────────────────────────────────
    tr: {
        navHome: 'Ana Sayfa',
        navSettings: 'Ayarlar',
        navBlocked: 'Engellenenler',
        navAbout: 'Hakkında',

        appName: 'X Reklam Engelleyici',
        protection: 'Koruma',
        statusActive: 'Aktif',
        statusPaused: 'Duraklatıldı',
        statBlocked: 'Engellenen',
        statDownloaded: 'İndirilen',
        mediaDownloader: 'Medya İndirici',
        mediaDownloaderSub: "Videolar, GIF'ler ve görseller",

        settingsTitle: 'Ayarlar',
        sectionAdBlocking: 'Reklam Engelleme',
        settingAutoBlock: 'Reklamverenleri otomatik engelle',
        settingAutoBlockSub: 'Hesabı kalıcı olarak engeller',
        settingToasts: 'Bildirim göster',
        settingToastsSub: 'Reklam engellenince onay göster',
        sectionDownloader: 'Medya İndirici',
        settingDownloadBtn: 'İndirme butonu göster',
        settingDownloadBtnSub: 'Her tweete buton ekle',
        btnReset: 'İstatistikleri Sıfırla',

        sectionLanguage: 'Dil',
        settingLanguage: 'Arayüz Dili',
        settingLanguageSub: 'Tarayıcı varsayılanını geçersiz kıl',
        langAuto: 'Otomatik (Tarayıcı)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'Hakkında',
        aboutDesc: "X'teki reklamverenleri otomatik olarak engeller ve video, GIF ile görsel indirmenizi sağlar — tamamen tarayıcı tarafında, veri toplanmaz.",
        howItWorks: 'Nasıl çalışır',
        howItWorksItem1: 'Reklam etiketlerini (Ad, Promoted, Reklam) MutationObserver ile algılar',
        howItWorksItem2: "Arka planda Engelle → Onayla'ya sessizce tıklar",
        howItWorksItem3: "En yüksek kaliteli MP4 için X'in Syndication API'sini kullanır",
        privacyTitle: 'Gizlilik',
        privacyDesc: "Hiçbir veri toplanmaz veya iletilmez. Tek dış istek cdn.syndication.twimg.com adresine yapılır — bu X'in kendi genel API'sidir — yalnızca indirme butonuna tıkladığınızda.",

        blockedTitle: 'Engellenen Reklamverenler',
        blockedNote: 'Bu liste bu oturumda engellenen reklamverenleri gösterir. Tüm X engel listenizi görmek için',
        blockedNoteLink: 'X → Ayarlar → Engellenen hesaplar',
        blockedEmpty: "Henüz hiçbir reklamveren engellenmedi. X'te gezinirken reklamlar otomatik olarak engellenecek.",
        viewOnX: "X'te Görüntüle",

        resetModalTitle: 'İstatistikleri Sıfırla',
        resetModalBody: 'Bu işlem tüm sayaçları ve engellenen reklamveren geçmişini temizler. Bu işlem geri alınamaz.',
        modalCancel: 'İptal',
        modalConfirm: 'Sıfırla',

        craftedBy: 'Geliştiren',

        toastBlocked: 'Engellendi:',
        toastNoTweetId: "Tweet ID'si bulunamadı.",
        toastVideoNotFound: 'Video bulunamadı (özel veya silinmiş olabilir).',
        toastVideoFailed: 'Video alınamadı:',
        toastNoMedia: 'Bu gönderide indirilebilir medya bulunamadı.',
        toastMediaDownloaded: 'Medya indirildi ✓',
        toastMediaDownloadedMulti: 'medya indirildi ✓',
        toastConverting: 'GIF Dönüştürülüyor...',

        downloaderAriaLabel: 'Medyayı indir',
    },

    // ── Deutsch ───────────────────────────────────────────────────────────────
    de: {
        navHome: 'Start',
        navSettings: 'Einstellungen',
        navBlocked: 'Gesperrt',
        navAbout: 'Über',

        appName: 'X Werbeblocker',
        protection: 'Schutz',
        statusActive: 'Aktiv',
        statusPaused: 'Pausiert',
        statBlocked: 'Gesperrt',
        statDownloaded: 'Heruntergeladen',
        mediaDownloader: 'Medien-Downloader',
        mediaDownloaderSub: 'Videos, GIFs & Bilder',

        settingsTitle: 'Einstellungen',
        sectionAdBlocking: 'Werbung blockieren',
        settingAutoBlock: 'Werbetreibende automatisch sperren',
        settingAutoBlockSub: 'Sperrt den Account dauerhaft',
        settingToasts: 'Benachrichtigungen anzeigen',
        settingToastsSub: 'Bestätigung bei gesperrter Werbung',
        sectionDownloader: 'Medien-Downloader',
        settingDownloadBtn: 'Download-Schaltfläche anzeigen',
        settingDownloadBtnSub: 'Schaltfläche in jeden Tweet einfügen',
        btnReset: 'Statistiken zurücksetzen',

        sectionLanguage: 'Sprache',
        settingLanguage: 'Oberflächensprache',
        settingLanguageSub: 'Browserstandard überschreiben',
        langAuto: 'Auto (Browser)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'Über',
        aboutDesc: "Sperrt Werbetreibende auf X automatisch und ermöglicht das Herunterladen von Videos, GIFs und Bildern — vollständig clientseitig, keine Datenerfassung.",
        howItWorks: 'Funktionsweise',
        howItWorksItem1: 'Erkennt Anzeigenbezeichnungen (Ad, Promoted, Reklam) über MutationObserver',
        howItWorksItem2: 'Klickt im Hintergrund lautlos auf Sperren → Bestätigen',
        howItWorksItem3: "Nutzt X's Syndication-API für die MP4-Datei mit höchster Bitrate",
        privacyTitle: 'Datenschutz',
        privacyDesc: "Es werden keine Daten gesammelt oder übertragen. Die einzige externe Anfrage geht an cdn.syndication.twimg.com — X's eigene öffentliche API — und nur wenn Sie auf die Download-Schaltfläche klicken.",

        blockedTitle: 'Gesperrte Werbetreibende',
        blockedNote: 'Diese Liste zeigt in dieser Sitzung gesperrte Werbetreibende. Die vollständige X-Sperrliste finden Sie unter',
        blockedNoteLink: 'X → Einstellungen → Gesperrte Konten',
        blockedEmpty: 'Noch keine Werbetreibenden gesperrt. Surfen Sie auf X und Werbung wird automatisch gesperrt.',
        viewOnX: 'Auf X anzeigen',

        resetModalTitle: 'Statistiken zurücksetzen',
        resetModalBody: 'Dadurch werden alle Zähler und der Verlauf gesperrter Werbetreibender gelöscht. Dies kann nicht rückgängig gemacht werden.',
        modalCancel: 'Abbrechen',
        modalConfirm: 'Zurücksetzen',

        craftedBy: 'Erstellt von',

        toastBlocked: 'Gesperrt:',
        toastNoTweetId: 'Tweet-ID nicht gefunden.',
        toastVideoNotFound: 'Video nicht gefunden (möglicherweise privat oder gelöscht).',
        toastVideoFailed: 'Video konnte nicht abgerufen werden:',
        toastNoMedia: 'Keine herunterladbaren Medien in diesem Beitrag gefunden.',
        toastMediaDownloaded: 'Medien heruntergeladen ✓',
        toastMediaDownloadedMulti: 'Medien heruntergeladen ✓',

        downloaderAriaLabel: 'Medien herunterladen',
    },

    // ── Français ──────────────────────────────────────────────────────────────
    fr: {
        navHome: 'Accueil',
        navSettings: 'Paramètres',
        navBlocked: 'Bloqués',
        navAbout: 'À propos',

        appName: 'Bloqueur de pubs X',
        protection: 'Protection',
        statusActive: 'Actif',
        statusPaused: 'En pause',
        statBlocked: 'Bloqués',
        statDownloaded: 'Téléchargés',
        mediaDownloader: 'Téléchargeur de médias',
        mediaDownloaderSub: 'Vidéos, GIFs & images',

        settingsTitle: 'Paramètres',
        sectionAdBlocking: 'Blocage des publicités',
        settingAutoBlock: 'Bloquer automatiquement les annonceurs',
        settingAutoBlockSub: 'Bloque le compte définitivement',
        settingToasts: 'Afficher les notifications',
        settingToastsSub: "Confirme le blocage d'une pub",
        sectionDownloader: 'Téléchargeur de médias',
        settingDownloadBtn: 'Afficher le bouton de téléchargement',
        settingDownloadBtnSub: 'Injecter un bouton dans chaque tweet',
        btnReset: 'Réinitialiser les statistiques',

        sectionLanguage: 'Langue',
        settingLanguage: "Langue de l'interface",
        settingLanguageSub: 'Remplacer la langue du navigateur',
        langAuto: 'Auto (Navigateur)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'À propos',
        aboutDesc: "Bloque automatiquement les annonceurs sur X et vous permet de télécharger des vidéos, GIFs et images — entièrement côté client, aucune donnée collectée.",
        howItWorks: 'Comment ça marche',
        howItWorksItem1: 'Détecte les labels publicitaires (Ad, Promoted, Reklam) via MutationObserver',
        howItWorksItem2: 'Clique silencieusement sur Bloquer → Confirmer en arrière-plan',
        howItWorksItem3: "Utilise l'API Syndication de X pour récupérer le MP4 avec le débit le plus élevé",
        privacyTitle: 'Confidentialité',
        privacyDesc: "Aucune donnée n'est collectée ou transmise. La seule requête externe va vers cdn.syndication.twimg.com — l'API publique de X — et uniquement lorsque vous cliquez sur le bouton de téléchargement.",

        blockedTitle: 'Annonceurs bloqués',
        blockedNote: 'Cette liste suit les annonceurs bloqués au cours de cette session. Pour voir votre liste de blocage complète sur X, visitez',
        blockedNoteLink: 'X → Paramètres → Comptes bloqués',
        blockedEmpty: 'Aucun annonceur bloqué pour l\'instant. Parcourez X et les publicités seront bloquées automatiquement.',
        viewOnX: 'Voir sur X',

        resetModalTitle: 'Réinitialiser les statistiques',
        resetModalBody: "Cela effacera tous les compteurs et l'historique des annonceurs bloqués. Cette action est irréversible.",
        modalCancel: 'Annuler',
        modalConfirm: 'Réinitialiser',

        craftedBy: 'Créé par',

        toastBlocked: 'Bloqué :',
        toastNoTweetId: 'ID du tweet introuvable.',
        toastVideoNotFound: 'Vidéo introuvable (peut-être privée ou supprimée).',
        toastVideoFailed: "Impossible d'obtenir la vidéo :",
        toastNoMedia: 'Aucun média téléchargeable trouvé dans ce post.',
        toastMediaDownloaded: 'Média téléchargé ✓',
        toastMediaDownloadedMulti: 'médias téléchargés ✓',

        downloaderAriaLabel: 'Télécharger le média',
    },

    // ── Español ───────────────────────────────────────────────────────────────
    es: {
        navHome: 'Inicio',
        navSettings: 'Ajustes',
        navBlocked: 'Bloqueados',
        navAbout: 'Acerca de',

        appName: 'Bloqueador de anuncios X',
        protection: 'Protección',
        statusActive: 'Activo',
        statusPaused: 'En pausa',
        statBlocked: 'Bloqueados',
        statDownloaded: 'Descargados',
        mediaDownloader: 'Descargador de medios',
        mediaDownloaderSub: 'Vídeos, GIFs e imágenes',

        settingsTitle: 'Ajustes',
        sectionAdBlocking: 'Bloqueo de anuncios',
        settingAutoBlock: 'Bloquear anunciantes automáticamente',
        settingAutoBlockSub: 'Bloquea la cuenta permanentemente',
        settingToasts: 'Mostrar notificaciones',
        settingToastsSub: 'Confirma cuando se bloquea un anuncio',
        sectionDownloader: 'Descargador de medios',
        settingDownloadBtn: 'Mostrar botón de descarga',
        settingDownloadBtnSub: 'Inyectar botón en cada tweet',
        btnReset: 'Restablecer estadísticas',

        sectionLanguage: 'Idioma',
        settingLanguage: 'Idioma de la interfaz',
        settingLanguageSub: 'Anular el idioma del navegador',
        langAuto: 'Auto (Navegador)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'Acerca de',
        aboutDesc: 'Bloquea automáticamente a los anunciantes en X y te permite descargar vídeos, GIFs e imágenes — todo en el cliente, sin datos recopilados.',
        howItWorks: 'Cómo funciona',
        howItWorksItem1: 'Detecta etiquetas de anuncios (Ad, Promoted, Reklam) mediante MutationObserver',
        howItWorksItem2: 'Hace clic silenciosamente en Bloquear → Confirmar en segundo plano',
        howItWorksItem3: 'Usa la API de Sindicación de X para obtener el MP4 de mayor tasa de bits',
        privacyTitle: 'Privacidad',
        privacyDesc: 'No se recopilan ni transmiten datos. La única solicitud externa va a cdn.syndication.twimg.com — la API pública de X — y solo cuando haces clic en el botón de descarga.',

        blockedTitle: 'Anunciantes bloqueados',
        blockedNote: 'Esta lista rastrea los anunciantes bloqueados en esta sesión. Para ver tu lista completa de bloqueos en X, visita',
        blockedNoteLink: 'X → Configuración → Cuentas bloqueadas',
        blockedEmpty: 'Aún no hay anunciantes bloqueados. Navega por X y los anuncios se bloquearán automáticamente.',
        viewOnX: 'Ver en X',

        resetModalTitle: 'Restablecer estadísticas',
        resetModalBody: 'Esto borrará todos los contadores y el historial de anunciantes bloqueados. Esta acción no se puede deshacer.',
        modalCancel: 'Cancelar',
        modalConfirm: 'Restablecer',

        craftedBy: 'Creado por',

        toastBlocked: 'Bloqueado:',
        toastNoTweetId: 'No se encontró el ID del tweet.',
        toastVideoNotFound: 'Vídeo no encontrado (puede ser privado o eliminado).',
        toastVideoFailed: 'Error al obtener el vídeo:',
        toastNoMedia: 'No se encontró contenido descargable en esta publicación.',
        toastMediaDownloaded: 'Medio descargado ✓',
        toastMediaDownloadedMulti: 'medios descargados ✓',

        downloaderAriaLabel: 'Descargar medio',
    },

    // ── Português ─────────────────────────────────────────────────────────────
    pt: {
        navHome: 'Início',
        navSettings: 'Configurações',
        navBlocked: 'Bloqueados',
        navAbout: 'Sobre',

        appName: 'Bloqueador de anúncios X',
        protection: 'Proteção',
        statusActive: 'Ativo',
        statusPaused: 'Pausado',
        statBlocked: 'Bloqueados',
        statDownloaded: 'Baixados',
        mediaDownloader: 'Baixador de mídia',
        mediaDownloaderSub: 'Vídeos, GIFs e imagens',

        settingsTitle: 'Configurações',
        sectionAdBlocking: 'Bloqueio de anúncios',
        settingAutoBlock: 'Bloquear anunciantes automaticamente',
        settingAutoBlockSub: 'Bloqueia a conta permanentemente',
        settingToasts: 'Mostrar notificações',
        settingToastsSub: 'Confirma quando um anúncio é bloqueado',
        sectionDownloader: 'Baixador de mídia',
        settingDownloadBtn: 'Mostrar botão de download',
        settingDownloadBtnSub: 'Injetar botão em cada tweet',
        btnReset: 'Redefinir estatísticas',

        sectionLanguage: 'Idioma',
        settingLanguage: 'Idioma da interface',
        settingLanguageSub: 'Substituir idioma do navegador',
        langAuto: 'Auto (Navegador)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'Sobre',
        aboutDesc: 'Bloqueia automaticamente anunciantes no X e permite baixar vídeos, GIFs e imagens — tudo no lado do cliente, sem coleta de dados.',
        howItWorks: 'Como funciona',
        howItWorksItem1: 'Detecta rótulos de anúncios (Ad, Promoted, Reklam) via MutationObserver',
        howItWorksItem2: 'Clica silenciosamente em Bloquear → Confirmar em segundo plano',
        howItWorksItem3: "Usa a API de Sindicalização do X para buscar o MP4 de maior taxa de bits",
        privacyTitle: 'Privacidade',
        privacyDesc: 'Nenhum dado é coletado ou transmitido. A única solicitação externa vai para cdn.syndication.twimg.com — a própria API pública do X — e somente quando você clica no botão de download.',

        blockedTitle: 'Anunciantes bloqueados',
        blockedNote: 'Esta lista rastreia os anunciantes bloqueados nesta sessão. Para ver sua lista completa de bloqueios no X, visite',
        blockedNoteLink: 'X → Configurações → Contas bloqueadas',
        blockedEmpty: 'Nenhum anunciante bloqueado ainda. Navegue pelo X e os anúncios serão bloqueados automaticamente.',
        viewOnX: 'Ver no X',

        resetModalTitle: 'Redefinir estatísticas',
        resetModalBody: 'Isso limpará todos os contadores e o histórico de anunciantes bloqueados. Esta ação não pode ser desfeita.',
        modalCancel: 'Cancelar',
        modalConfirm: 'Redefinir',

        craftedBy: 'Criado por',

        toastBlocked: 'Bloqueado:',
        toastNoTweetId: 'ID do tweet não encontrado.',
        toastVideoNotFound: 'Vídeo não encontrado (pode ser privado ou excluído).',
        toastVideoFailed: 'Falha ao obter vídeo:',
        toastNoMedia: 'Nenhuma mídia baixável encontrada nesta publicação.',
        toastMediaDownloaded: 'Mídia baixada ✓',
        toastMediaDownloadedMulti: 'mídias baixadas ✓',

        downloaderAriaLabel: 'Baixar mídia',
    },

    // ── Italiano ──────────────────────────────────────────────────────────────
    it: {
        navHome: 'Home',
        navSettings: 'Impostazioni',
        navBlocked: 'Bloccati',
        navAbout: 'Info',

        appName: 'Blocca pubblicità X',
        protection: 'Protezione',
        statusActive: 'Attivo',
        statusPaused: 'In pausa',
        statBlocked: 'Bloccati',
        statDownloaded: 'Scaricati',
        mediaDownloader: 'Scarica media',
        mediaDownloaderSub: 'Video, GIF e immagini',

        settingsTitle: 'Impostazioni',
        sectionAdBlocking: 'Blocco pubblicità',
        settingAutoBlock: 'Blocca automaticamente gli inserzionisti',
        settingAutoBlockSub: "Blocca l'account in modo permanente",
        settingToasts: 'Mostra notifiche',
        settingToastsSub: 'Conferma quando un annuncio è bloccato',
        sectionDownloader: 'Scarica media',
        settingDownloadBtn: 'Mostra pulsante di download',
        settingDownloadBtnSub: 'Inserisci pulsante in ogni tweet',
        btnReset: 'Azzera statistiche',

        sectionLanguage: 'Lingua',
        settingLanguage: "Lingua dell'interfaccia",
        settingLanguageSub: 'Sostituisci la lingua del browser',
        langAuto: 'Auto (Browser)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'Info',
        aboutDesc: 'Blocca automaticamente gli inserzionisti su X e ti permette di scaricare video, GIF e immagini — tutto lato client, nessun dato raccolto.',
        howItWorks: 'Come funziona',
        howItWorksItem1: 'Rileva le etichette degli annunci (Ad, Promoted, Reklam) tramite MutationObserver',
        howItWorksItem2: 'Clicca silenziosamente su Blocca → Conferma in background',
        howItWorksItem3: "Usa l'API Syndication di X per recuperare il MP4 con il bitrate più alto",
        privacyTitle: 'Privacy',
        privacyDesc: "Nessun dato viene raccolto o trasmesso. L'unica richiesta esterna va a cdn.syndication.twimg.com — la propria API pubblica di X — e solo quando fai clic sul pulsante di download.",

        blockedTitle: 'Inserzionisti bloccati',
        blockedNote: 'Questa lista traccia gli inserzionisti bloccati in questa sessione. Per vedere la tua lista completa di blocchi su X, visita',
        blockedNoteLink: 'X → Impostazioni → Account bloccati',
        blockedEmpty: 'Nessun inserzionista bloccato ancora. Naviga su X e gli annunci verranno bloccati automaticamente.',
        viewOnX: 'Visualizza su X',

        resetModalTitle: 'Azzera statistiche',
        resetModalBody: 'Questo cancellerà tutti i contatori e la cronologia degli inserzionisti bloccati. Questa operazione non può essere annullata.',
        modalCancel: 'Annulla',
        modalConfirm: 'Azzera',

        craftedBy: 'Creato da',

        toastBlocked: 'Bloccato:',
        toastNoTweetId: 'ID tweet non trovato.',
        toastVideoNotFound: 'Video non trovato (potrebbe essere privato o eliminato).',
        toastVideoFailed: 'Impossibile ottenere il video:',
        toastNoMedia: 'Nessun media scaricabile trovato in questo post.',
        toastMediaDownloaded: 'Media scaricato ✓',
        toastMediaDownloadedMulti: 'media scaricati ✓',

        downloaderAriaLabel: 'Scarica media',
    },

    // ── Русский ───────────────────────────────────────────────────────────────
    ru: {
        navHome: 'Главная',
        navSettings: 'Настройки',
        navBlocked: 'Заблокированные',
        navAbout: 'О расширении',

        appName: 'Блокировщик рекламы X',
        protection: 'Защита',
        statusActive: 'Активен',
        statusPaused: 'Приостановлен',
        statBlocked: 'Заблокировано',
        statDownloaded: 'Загружено',
        mediaDownloader: 'Загрузчик медиа',
        mediaDownloaderSub: 'Видео, GIF и изображения',

        settingsTitle: 'Настройки',
        sectionAdBlocking: 'Блокировка рекламы',
        settingAutoBlock: 'Автоблокировка рекламодателей',
        settingAutoBlockSub: 'Навсегда блокирует аккаунт',
        settingToasts: 'Показывать уведомления',
        settingToastsSub: 'Подтверждение при блокировке рекламы',
        sectionDownloader: 'Загрузчик медиа',
        settingDownloadBtn: 'Показывать кнопку загрузки',
        settingDownloadBtnSub: 'Добавить кнопку в каждый твит',
        btnReset: 'Сбросить статистику',

        sectionLanguage: 'Язык',
        settingLanguage: 'Язык интерфейса',
        settingLanguageSub: 'Переопределить язык браузера',
        langAuto: 'Авто (Браузер)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: 'О расширении',
        aboutDesc: 'Автоматически блокирует рекламодателей в X и позволяет загружать видео, GIF и изображения — полностью на стороне клиента, без сбора данных.',
        howItWorks: 'Как это работает',
        howItWorksItem1: 'Обнаруживает метки рекламы (Ad, Promoted, Reklam) через MutationObserver',
        howItWorksItem2: 'Незаметно нажимает Заблокировать → Подтвердить в фоне',
        howItWorksItem3: 'Использует Syndication API X для получения MP4 с наивысшим битрейтом',
        privacyTitle: 'Конфиденциальность',
        privacyDesc: 'Никакие данные не собираются и не передаются. Единственный внешний запрос — к cdn.syndication.twimg.com — собственному публичному API X — и только при нажатии кнопки загрузки.',

        blockedTitle: 'Заблокированные рекламодатели',
        blockedNote: 'Этот список отслеживает рекламодателей, заблокированных в этой сессии. Чтобы увидеть полный список блокировок в X, посетите',
        blockedNoteLink: 'X → Настройки → Заблокированные аккаунты',
        blockedEmpty: 'Рекламодателей пока нет. Просматривайте X, и реклама будет блокироваться автоматически.',
        viewOnX: 'Открыть в X',

        resetModalTitle: 'Сбросить статистику',
        resetModalBody: 'Это очистит все счётчики и историю заблокированных рекламодателей. Это действие нельзя отменить.',
        modalCancel: 'Отмена',
        modalConfirm: 'Сбросить',

        craftedBy: 'Создано',

        toastBlocked: 'Заблокировано:',
        toastNoTweetId: 'ID твита не найден.',
        toastVideoNotFound: 'Видео не найдено (может быть приватным или удалённым).',
        toastVideoFailed: 'Не удалось получить видео:',
        toastNoMedia: 'В этом посте нет загружаемых медиафайлов.',
        toastMediaDownloaded: 'Медиа загружено ✓',
        toastMediaDownloadedMulti: 'медиафайлов загружено ✓',

        downloaderAriaLabel: 'Загрузить медиа',
    },

    // ── 日本語 ────────────────────────────────────────────────────────────────
    ja: {
        navHome: 'ホーム',
        navSettings: '設定',
        navBlocked: 'ブロック済み',
        navAbout: '概要',

        appName: 'X 広告ブロッカー',
        protection: '保護',
        statusActive: '有効',
        statusPaused: '停止中',
        statBlocked: 'ブロック済み',
        statDownloaded: 'ダウンロード済み',
        mediaDownloader: 'メディアダウンローダー',
        mediaDownloaderSub: '動画・GIF・画像',

        settingsTitle: '設定',
        sectionAdBlocking: '広告ブロック',
        settingAutoBlock: '広告主を自動ブロック',
        settingAutoBlockSub: 'アカウントを永久にブロック',
        settingToasts: 'トースト通知を表示',
        settingToastsSub: '広告がブロックされたとき確認する',
        sectionDownloader: 'メディアダウンローダー',
        settingDownloadBtn: 'ダウンロードボタンを表示',
        settingDownloadBtnSub: 'すべてのツイートにボタンを挿入',
        btnReset: '統計をリセット',

        sectionLanguage: '言語',
        settingLanguage: 'インターフェース言語',
        settingLanguageSub: 'ブラウザのデフォルトを上書き',
        langAuto: '自動（ブラウザ）',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: '概要',
        aboutDesc: 'Xの広告主を自動的にブロックし、動画・GIF・画像をダウンロードできます — すべてクライアントサイド、データ収集なし。',
        howItWorks: '仕組み',
        howItWorksItem1: 'MutationObserverで広告ラベル（Ad、Promoted、Reklam）を検出',
        howItWorksItem2: 'バックグラウンドでブロック → 確認を自動クリック',
        howItWorksItem3: 'XのSyndication APIを使用して最高ビットレートのMP4を取得',
        privacyTitle: 'プライバシー',
        privacyDesc: 'データの収集・送信は一切ありません。外部へのリクエストはcdn.syndication.twimg.com（XのパブリックAPI）のみで、ダウンロードボタンをクリックした場合のみです。',

        blockedTitle: 'ブロック済み広告主',
        blockedNote: 'このリストはこのセッションでブロックした広告主を追跡します。Xの完全なブロックリストを確認するには',
        blockedNoteLink: 'X → 設定 → ブロックしたアカウント',
        blockedEmpty: 'まだ広告主はブロックされていません。Xを閲覧すると広告は自動的にブロックされます。',
        viewOnX: 'Xで表示',

        resetModalTitle: '統計をリセット',
        resetModalBody: 'すべてのカウンターとブロック済み広告主の履歴が削除されます。この操作は取り消せません。',
        modalCancel: 'キャンセル',
        modalConfirm: 'リセット',

        craftedBy: '制作',

        toastBlocked: 'ブロック済み:',
        toastNoTweetId: 'ツイートIDが見つかりませんでした。',
        toastVideoNotFound: '動画が見つかりません（非公開または削除された可能性があります）。',
        toastVideoFailed: '動画の取得に失敗しました:',
        toastNoMedia: 'この投稿にダウンロード可能なメディアが見つかりませんでした。',
        toastMediaDownloaded: 'メディアをダウンロードしました ✓',
        toastMediaDownloadedMulti: '件のメディアをダウンロードしました ✓',

        downloaderAriaLabel: 'メディアをダウンロード',
    },

    // ── 한국어 ────────────────────────────────────────────────────────────────
    ko: {
        navHome: '홈',
        navSettings: '설정',
        navBlocked: '차단됨',
        navAbout: '정보',

        appName: 'X 광고 차단기',
        protection: '보호',
        statusActive: '활성',
        statusPaused: '일시정지',
        statBlocked: '차단됨',
        statDownloaded: '다운로드됨',
        mediaDownloader: '미디어 다운로더',
        mediaDownloaderSub: '동영상, GIF 및 이미지',

        settingsTitle: '설정',
        sectionAdBlocking: '광고 차단',
        settingAutoBlock: '광고주 자동 차단',
        settingAutoBlockSub: '계정을 영구적으로 차단',
        settingToasts: '토스트 알림 표시',
        settingToastsSub: '광고가 차단될 때 확인',
        sectionDownloader: '미디어 다운로더',
        settingDownloadBtn: '다운로드 버튼 표시',
        settingDownloadBtnSub: '모든 트윗에 버튼 삽입',
        btnReset: '통계 초기화',

        sectionLanguage: '언어',
        settingLanguage: '인터페이스 언어',
        settingLanguageSub: '브라우저 기본값 재정의',
        langAuto: '자동 (브라우저)',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: '정보',
        aboutDesc: 'X에서 광고주를 자동으로 차단하고 동영상, GIF, 이미지를 다운로드할 수 있습니다 — 모두 클라이언트 측에서 처리되며 데이터 수집 없음.',
        howItWorks: '작동 방식',
        howItWorksItem1: 'MutationObserver를 통해 광고 라벨(Ad, Promoted, Reklam)을 감지',
        howItWorksItem2: '백그라운드에서 차단 → 확인을 자동으로 클릭',
        howItWorksItem3: 'X의 Syndication API를 사용하여 최고 비트레이트 MP4 가져오기',
        privacyTitle: '개인정보',
        privacyDesc: '어떠한 데이터도 수집하거나 전송하지 않습니다. 유일한 외부 요청은 cdn.syndication.twimg.com(X의 공개 API)으로 다운로드 버튼을 클릭할 때만 발생합니다.',

        blockedTitle: '차단된 광고주',
        blockedNote: '이 목록은 이번 세션에서 차단된 광고주를 추적합니다. X의 전체 차단 목록을 보려면 방문하세요',
        blockedNoteLink: 'X → 설정 → 차단된 계정',
        blockedEmpty: '아직 차단된 광고주가 없습니다. X를 탐색하면 광고가 자동으로 차단됩니다.',
        viewOnX: 'X에서 보기',

        resetModalTitle: '통계 초기화',
        resetModalBody: '모든 카운터와 차단된 광고주 기록이 삭제됩니다. 이 작업은 취소할 수 없습니다.',
        modalCancel: '취소',
        modalConfirm: '초기화',

        craftedBy: '제작',

        toastBlocked: '차단됨:',
        toastNoTweetId: '트윗 ID를 찾을 수 없습니다.',
        toastVideoNotFound: '동영상을 찾을 수 없습니다(비공개 또는 삭제되었을 수 있습니다).',
        toastVideoFailed: '동영상 가져오기 실패:',
        toastNoMedia: '이 게시물에서 다운로드 가능한 미디어를 찾을 수 없습니다.',
        toastMediaDownloaded: '미디어 다운로드됨 ✓',
        toastMediaDownloadedMulti: '개 미디어 다운로드됨 ✓',

        downloaderAriaLabel: '미디어 다운로드',
    },

    // ── 中文（简体）──────────────────────────────────────────────────────────
    zh: {
        navHome: '主页',
        navSettings: '设置',
        navBlocked: '已屏蔽',
        navAbout: '关于',

        appName: 'X 广告拦截器',
        protection: '保护',
        statusActive: '已启用',
        statusPaused: '已暂停',
        statBlocked: '已屏蔽',
        statDownloaded: '已下载',
        mediaDownloader: '媒体下载器',
        mediaDownloaderSub: '视频、GIF 和图片',

        settingsTitle: '设置',
        sectionAdBlocking: '广告屏蔽',
        settingAutoBlock: '自动屏蔽广告主',
        settingAutoBlockSub: '永久屏蔽该账户',
        settingToasts: '显示弹窗通知',
        settingToastsSub: '广告被屏蔽时确认',
        sectionDownloader: '媒体下载器',
        settingDownloadBtn: '显示下载按钮',
        settingDownloadBtnSub: '在每条推文中注入按钮',
        btnReset: '重置统计',

        sectionLanguage: '语言',
        settingLanguage: '界面语言',
        settingLanguageSub: '覆盖浏览器默认语言',
        langAuto: '自动（浏览器）',
        langEn: 'English',
        langTr: 'Türkçe',
        langDe: 'Deutsch',
        langFr: 'Français',
        langEs: 'Español',
        langPt: 'Português',
        langIt: 'Italiano',
        langRu: 'Русский',
        langJa: '日本語',
        langKo: '한국어',
        langZh: '中文',

        aboutTitle: '关于',
        aboutDesc: '自动屏蔽 X 上的广告主，并允许下载视频、GIF 和图片 — 完全在客户端处理，不收集数据。',
        howItWorks: '工作原理',
        howItWorksItem1: '通过 MutationObserver 检测广告标签（Ad、Promoted、Reklam）',
        howItWorksItem2: '在后台静默点击屏蔽 → 确认',
        howItWorksItem3: '使用 X 的 Syndication API 获取最高比特率的 MP4',
        privacyTitle: '隐私',
        privacyDesc: '不收集或传输任何数据。唯一的外部请求是向 cdn.syndication.twimg.com（X 的公开 API），且仅在点击下载按钮时发生。',

        blockedTitle: '已屏蔽的广告主',
        blockedNote: '此列表跟踪本次会话中屏蔽的广告主。要查看您在 X 上的完整屏蔽列表，请访问',
        blockedNoteLink: 'X → 设置 → 已屏蔽账户',
        blockedEmpty: '尚未屏蔽任何广告主。浏览 X 时，广告将自动被屏蔽。',
        viewOnX: '在 X 上查看',

        resetModalTitle: '重置统计',
        resetModalBody: '这将清除所有计数器和已屏蔽广告主的历史记录。此操作无法撤销。',
        modalCancel: '取消',
        modalConfirm: '重置',

        craftedBy: '由',

        toastBlocked: '已屏蔽:',
        toastNoTweetId: '找不到推文 ID。',
        toastVideoNotFound: '视频未找到（可能是私密或已删除）。',
        toastVideoFailed: '获取视频失败:',
        toastNoMedia: '此帖子中未找到可下载的媒体。',
        toastMediaDownloaded: '媒体已下载 ✓',
        toastMediaDownloadedMulti: '个媒体已下载 ✓',

        downloaderAriaLabel: '下载媒体',
    },
};

// =============================================================================
// i18n engine — exposed as a global `i18n` object
// =============================================================================

const i18n = (() => {
    let _lang = DEFAULT_LANG;
    let _ready = false;

    function _resolve(userLang) {
        if (userLang && userLang !== 'auto' && SUPPORTED_LANGS.includes(userLang)) {
            return userLang;
        }
        try {
            const uiLang = (chrome.i18n?.getUILanguage?.() || navigator.language || '').split('-')[0].toLowerCase();
            if (SUPPORTED_LANGS.includes(uiLang)) return uiLang;
        } catch (_) { /* noop */ }
        return DEFAULT_LANG;
    }

    async function init() {
        if (_ready) return _lang;
        return new Promise(resolve => {
            try {
                chrome.storage.local.get('userLang', (res) => {
                    _lang = _resolve(res?.userLang);
                    _ready = true;
                    resolve(_lang);
                });
            } catch (_) {
                _lang = _resolve(null);
                _ready = true;
                resolve(_lang);
            }
        });
    }

    async function setLang(lang) {
        const next = (lang === 'auto' || !SUPPORTED_LANGS.includes(lang)) ? 'auto' : lang;
        await new Promise(resolve => chrome.storage.local.set({ userLang: next }, resolve));
        _ready = false;
        await init();
        return _lang;
    }

    function t(key) {
        return (TRANSLATIONS[_lang]?.[key]) ??
            (TRANSLATIONS[DEFAULT_LANG]?.[key]) ??
            key;
    }

    function applyToDOM(root = document) {
        root.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });
        root.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.dataset.i18nHtml);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const val = t(el.dataset.i18nTitle);
            el.title = val;
            el.setAttribute('aria-label', val);
        });
    }

    function getLang() { return _lang; }

    return { init, setLang, getLang, t, applyToDOM, SUPPORTED_LANGS };
})();