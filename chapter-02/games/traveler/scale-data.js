export const instrument = {
  "id": "tipi10-lu2020-traditional-interface-v1",
  "version": "2026-10-04",
  "verified": true,
  "min": 1,
  "max": 7,
  "title": {
    "zh": "十題人格量表（TIPI）",
    "en": "Ten-Item Personality Inventory (TIPI)"
  },
  "translationCredit": "Chinese items: Lu et al. (2020); Traditional character conversion and bilingual response interface by this classroom project.",
  "stem": {
    "zh": "我認為我是一個：",
    "en": "I see myself as:"
  },
  "instructions": {
    "zh": "請為每一組描述選擇你同意或不同意的程度。請評估兩個描述整體是否適用於你，即使其中一個比另一個更符合。",
    "en": "Rate how much you agree or disagree with each description. Consider the pair of descriptions together, even if one applies more strongly than the other."
  },
  "responseOptions": [
    {
      "value": 1,
      "label": {
        "zh": "非常不同意",
        "en": "Disagree strongly"
      }
    },
    {
      "value": 2,
      "label": {
        "zh": "相當不同意",
        "en": "Disagree moderately"
      }
    },
    {
      "value": 3,
      "label": {
        "zh": "有點不同意",
        "en": "Disagree a little"
      }
    },
    {
      "value": 4,
      "label": {
        "zh": "既非同意，也非不同意",
        "en": "Neither agree nor disagree"
      }
    },
    {
      "value": 5,
      "label": {
        "zh": "有點同意",
        "en": "Agree a little"
      }
    },
    {
      "value": 6,
      "label": {
        "zh": "相當同意",
        "en": "Agree moderately"
      }
    },
    {
      "value": 7,
      "label": {
        "zh": "非常同意",
        "en": "Agree strongly"
      }
    }
  ],
  "domains": [
    {
      "id": "E",
      "name": {
        "zh": "外向性",
        "en": "Extraversion"
      },
      "itemCount": 2
    },
    {
      "id": "A",
      "name": {
        "zh": "親和性",
        "en": "Agreeableness"
      },
      "itemCount": 2
    },
    {
      "id": "C",
      "name": {
        "zh": "盡責性",
        "en": "Conscientiousness"
      },
      "itemCount": 2
    },
    {
      "id": "ES",
      "name": {
        "zh": "情緒穩定性",
        "en": "Emotional Stability"
      },
      "itemCount": 2
    },
    {
      "id": "O",
      "name": {
        "zh": "經驗開放性",
        "en": "Openness to Experiences"
      },
      "itemCount": 2
    }
  ],
  "items": [
    {
      "id": 1,
      "text": {
        "zh": "外向的，熱情的",
        "en": "Extraverted, enthusiastic."
      },
      "domain": "E",
      "reverse": false
    },
    {
      "id": 2,
      "text": {
        "zh": "挑剔的，愛爭論的",
        "en": "Critical, quarrelsome."
      },
      "domain": "A",
      "reverse": true
    },
    {
      "id": 3,
      "text": {
        "zh": "可靠的，自律的",
        "en": "Dependable, self-disciplined."
      },
      "domain": "C",
      "reverse": false
    },
    {
      "id": 4,
      "text": {
        "zh": "焦慮的，易心煩的",
        "en": "Anxious, easily upset."
      },
      "domain": "ES",
      "reverse": true
    },
    {
      "id": 5,
      "text": {
        "zh": "願意接觸新事物的，思維複雜的",
        "en": "Open to new experiences, complex."
      },
      "domain": "O",
      "reverse": false
    },
    {
      "id": 6,
      "text": {
        "zh": "內斂的，安靜的",
        "en": "Reserved, quiet."
      },
      "domain": "E",
      "reverse": true
    },
    {
      "id": 7,
      "text": {
        "zh": "有同情心的，溫暖的",
        "en": "Sympathetic, warm."
      },
      "domain": "A",
      "reverse": false
    },
    {
      "id": 8,
      "text": {
        "zh": "缺乏條理的，粗心的",
        "en": "Disorganized, careless."
      },
      "domain": "C",
      "reverse": true
    },
    {
      "id": 9,
      "text": {
        "zh": "冷靜的，情緒穩定的",
        "en": "Calm, emotionally stable."
      },
      "domain": "ES",
      "reverse": false
    },
    {
      "id": 10,
      "text": {
        "zh": "循規蹈矩的，缺乏創造性的",
        "en": "Conventional, uncreative."
      },
      "domain": "O",
      "reverse": true
    }
  ],
  "sources": [
    {
      "title": {
        "zh": "TIPI 作者頁：使用許可、計分與譯本限制",
        "en": "TIPI author page: permission, scoring and translation limitations"
      },
      "url": "https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/",
      "local": "./sources/tipi-permission-notes.txt"
    },
    {
      "title": {
        "zh": "正式英文原題、1–7 量尺與計分 key",
        "en": "Original English items, 1–7 scale and scoring key"
      },
      "url": "https://gosling.psy.utexas.edu/wp-content/uploads/2014/09/tipi.pdf",
      "local": "./sources/tipi-en.pdf"
    },
    {
      "title": {
        "zh": "Lu 等（2020）中文題項附錄",
        "en": "Lu et al. (2020) Chinese item appendix"
      },
      "url": "https://gosling.psy.utexas.edu/wp-content/uploads/2020/03/Chinese-TIPI.pdf",
      "local": "./sources/tipi-items-and-key.json"
    },
    {
      "title": {
        "zh": "作者對短量表測量限制的說明",
        "en": "Author’s note on brief-measure limitations"
      },
      "url": "https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/a-note-on-alpha-reliability-and-factor-structure-in-the-tipi/",
      "local": "./sources/tipi-limitations-notes.txt"
    }
  ],
  "provenance": {
    "zh": "英文 TIPI 與正式計分依 Gosling 等（2003）；中文採原作者網站收錄之 Lu 等（2020）譯文，僅轉為繁體字形，作答選項為中英介面對照。本平台雙語呈現未另作效度驗證，僅供教學自我探索。",
    "en": "English TIPI items and scoring follow Gosling et al. (2003). Chinese items use Lu et al. (2020), hosted on the original author’s website, with Traditional character conversion and bilingual response labels. This platform’s bilingual presentation has not undergone separate validity testing and is for classroom self-exploration."
  }
};
