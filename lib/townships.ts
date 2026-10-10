export interface TownshipSlide {
  township: string;
  province: string;
  src: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

export const TOWNSHIP_SLIDES: TownshipSlide[] = [
  {
    township: "Mamelodi",
    province: "Gauteng",
    src: "https://upload.wikimedia.org/wikipedia/commons/3/30/Mamelodi.JPG",
    credit: "Photographer not identified on Commons",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mamelodi.JPG",
  },
  {
    township: "Soweto",
    province: "Gauteng",
    src: "https://upload.wikimedia.org/wikipedia/commons/8/84/Soweto_Market_2011.jpg",
    credit: "Nolabob",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Soweto_Market_2011.jpg",
  },
  {
    township: "Khayelitsha",
    province: "Western Cape",
    src: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Khayelitsha%2C_Baden_Powell_Drive_%28South_Africa%29.jpg",
    credit: "Olga Ernst",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Khayelitsha,_Baden_Powell_Drive_(South_Africa).jpg",
  },
  {
    township: "Umlazi",
    province: "KwaZulu-Natal",
    src: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Umlazi%2C_South_Africa.jpg",
    credit: "Yan-Di Chang",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Umlazi,_South_Africa.jpg",
  },
];
