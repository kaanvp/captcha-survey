/**
 * CAPTCHA HCI Experiment - Fixed Stimuli Manifest
 * "Uyaran Sabitliği" gereğince tüm uyaranlar sabittir ve önceden tanımlıdır.
 * Görsel kareleri yerel fotoğraf (JPEG) dosyalarından (images/tiles/) yüklenir; harici CDN kullanılmaz.
 * Çalışma anında rasgele görsel/içerik üretilmez; her katılımcı bu sabit havuzla test edilir.
 */

const STIMULI = {
  version: "1.0.0",
  // Yerel fotoğraf (JPEG) kare dosyaları (images/tiles/) — harici CDN yok
  tiles: {
    // Bisiklet Hedefleri (6 adet)
    "tile_bike_01": { id: "tile_bike_01", file: "images/tiles/tile_bike_01.jpg", isTarget: true, label: "bisiklet", desc: "Bina önünde bisiklet park demirine kilitli bisikletler" },
    "tile_bike_02": { id: "tile_bike_02", file: "images/tiles/tile_bike_02.jpg", isTarget: true, label: "bisiklet", desc: "Taş duvar önünde park edilmiş bisiklet" },
    "tile_bike_03": { id: "tile_bike_03", file: "images/tiles/tile_bike_03.jpg", isTarget: true, label: "bisiklet", desc: "Amsterdam'da duvar önünde park edilmiş şehir bisikleti" },
    "tile_bike_04": { id: "tile_bike_04", file: "images/tiles/tile_bike_04.jpg", isTarget: true, label: "bisiklet", desc: "Bisiklet kafesinde park edilmiş bisiklet" },
    "tile_bike_05": { id: "tile_bike_05", file: "images/tiles/tile_bike_05.jpg", isTarget: true, label: "bisiklet", desc: "Çocuk koltuğu olan park edilmiş şehir bisikleti" },
    "tile_bike_06": { id: "tile_bike_06", file: "images/tiles/tile_bike_06.jpg", isTarget: true, label: "bisiklet", desc: "Yolda bisiklet süren kişi" },
    // Karıştırıcılar (9 adet)
    "tile_dist_motorcycle": { id: "tile_dist_motorcycle", file: "images/tiles/tile_dist_motorcycle.jpg", isTarget: false, label: "karıştırıcı", desc: "Yol kenarında park edilmiş motosiklet" },
    "tile_dist_scooter":    { id: "tile_dist_scooter",    file: "images/tiles/tile_dist_scooter.jpg", isTarget: false, label: "karıştırıcı", desc: "Kaldırımda elektrikli skuter" },
    "tile_dist_bench":      { id: "tile_dist_bench",      file: "images/tiles/tile_dist_bench.jpg", isTarget: false, label: "karıştırıcı", desc: "Park bankı" },
    "tile_dist_fence":      { id: "tile_dist_fence",      file: "images/tiles/tile_dist_fence.jpg", isTarget: false, label: "karıştırıcı", desc: "Ferforje bahçe parmaklığı" },
    "tile_dist_hydrant":    { id: "tile_dist_hydrant",    file: "images/tiles/tile_dist_hydrant.jpg", isTarget: false, label: "karıştırıcı", desc: "Yangın musluğu" },
    "tile_dist_lamp":       { id: "tile_dist_lamp",       file: "images/tiles/tile_dist_lamp.jpg", isTarget: false, label: "karıştırıcı", desc: "Kent meydanında sıralı sokak lambaları" },
    "tile_dist_car":        { id: "tile_dist_car",        file: "images/tiles/tile_dist_car.jpg", isTarget: false, label: "karıştırıcı", desc: "Park edilmiş otomobil" },
    "tile_dist_bus_stop":   { id: "tile_dist_bus_stop",   file: "images/tiles/tile_dist_bus_stop.jpg", isTarget: false, label: "karıştırıcı", desc: "Otobüs durağı" },
    "tile_dist_fountain":   { id: "tile_dist_fountain",   file: "images/tiles/tile_dist_fountain.jpg", isTarget: false, label: "karıştırıcı", desc: "Sanat müzesi önündeki kent çeşmesi" }
  },

  // Görsel Seçimi Sabit Bulmacaları (Deneme 1, 2, 3)
  imagePuzzles: [
    {
      trialIndex: 1,
      puzzleId: "img_puz_01",
      instruction: "İçinde bisiklet olan tüm kareleri seçin.",
      targetIds: ["tile_bike_01", "tile_bike_02", "tile_bike_03"],
      layout: [
        "tile_bike_01",
        "tile_dist_bench",
        "tile_dist_motorcycle",
        "tile_dist_fence",
        "tile_bike_02",
        "tile_dist_hydrant",
        "tile_dist_lamp",
        "tile_bike_03",
        "tile_dist_car"
      ]
    },
    {
      trialIndex: 2,
      puzzleId: "img_puz_02",
      instruction: "İçinde bisiklet olan tüm kareleri seçin.",
      targetIds: ["tile_bike_04", "tile_bike_05"],
      layout: [
        "tile_dist_scooter",
        "tile_bike_04",
        "tile_dist_bus_stop",
        "tile_dist_lamp",
        "tile_dist_bench",
        "tile_bike_05",
        "tile_dist_fence",
        "tile_dist_hydrant",
        "tile_dist_car"
      ]
    },
    {
      trialIndex: 3,
      puzzleId: "img_puz_03",
      instruction: "İçinde bisiklet olan tüm kareleri seçin.",
      targetIds: ["tile_bike_01", "tile_bike_03", "tile_bike_05", "tile_bike_06"],
      layout: [
        "tile_bike_01",
        "tile_dist_fountain",
        "tile_bike_03",
        "tile_dist_motorcycle",
        "tile_bike_05",
        "tile_dist_bench",
        "tile_dist_hydrant",
        "tile_bike_06",
        "tile_dist_car"
      ]
    }
  ],

  // Bozulmuş Metin Sabit Uyaranları (Deneme 1, 2, 3)
  textStimuli: [
    {
      trialIndex: 1,
      stimulusId: "txt_stim_01",
      text: "T7W2K",
      seed: 10427,
      charAngles: [-12, 14, -8, 16, -10],
      charOffsetsY: [4, -6, 5, -3, 6],
      refreshVariants: [
        { text: "M4K9R", charAngles: [10, -14, 8, -12, 15], charOffsetsY: [-4, 5, -3, 6, -5] },
        { text: "D2X7P", charAngles: [-15, 11, -13, 9, -16], charOffsetsY: [5, -4, 6, -5, 3] }
      ]
    },
    {
      trialIndex: 2,
      stimulusId: "txt_stim_02",
      text: "P8X4M",
      seed: 20851,
      charAngles: [15, -10, 12, -14, 8],
      charOffsetsY: [-5, 7, -4, 5, -6],
      refreshVariants: [
        { text: "V6H3Y", charAngles: [-11, 13, -15, 8, -10], charOffsetsY: [6, -4, 5, -7, 4] },
        { text: "B9E4C", charAngles: [14, -12, 10, -16, 12], charOffsetsY: [-5, 6, -3, 5, -6] }
      ]
    },
    {
      trialIndex: 3,
      stimulusId: "txt_stim_03",
      text: "H3N9F",
      seed: 31415,
      charAngles: [-16, 12, -15, 10, -8],
      charOffsetsY: [6, -5, 7, -6, 4],
      refreshVariants: [
        { text: "R8T2W", charAngles: [12, -14, 11, -13, 15], charOffsetsY: [-4, 6, -5, 4, -5] },
        { text: "C5M7K", charAngles: [-13, 15, -9, 14, -11], charOffsetsY: [5, -6, 4, -4, 6] }
      ]
    }
  ]
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = STIMULI;
}
