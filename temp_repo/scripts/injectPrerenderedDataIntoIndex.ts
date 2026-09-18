import fs from 'fs';
import path from 'path';
import { permanentProductsData } from '../src/data/permanentProductsData';

const BASE_URL = 'https://savremenikoreni.com';

export function getFullStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "Store", "CraftStore"],
        "@id": `${BASE_URL}/#organization`,
        "name": "Savremeni Koreni",
        "legalName": "TANjA PETRIĆ PR PROIZVODNjA OSTALIH TEKSTILNIH PREDMETA SAVREMENI KORENI JOŠANICA",
        "url": BASE_URL,
        "logo": `${BASE_URL}/logo.jpg`,
        "image": `${BASE_URL}/logo.jpg`,
        "description": "Zanatska radionica i vodeći autoritet za tradicionalni srpski i vlaški vez, narodnu nošnju Homolja, bele vlaške šubare, vezene čarape za folklor, unikatne makrame torbice i ručni rad. Vlasnik Tanja Petrić, Jošanica (Žagubica).",
        "vatID": "115789396",
        "taxID": "115789396",
        "identifier": "68635870",
        "telephone": "+381603318319",
        "email": "savremenikoreni@gmail.com",
        "priceRange": "$$",
        "currenciesAccepted": "RSD, EUR, USD, CHF",
        "paymentAccepted": "Cash, Credit Card, Visa, Mastercard, DinaCard, Maestro, Bank Transfer, IPS QR, PayPal",
        "hasMap": "https://www.google.com/maps/search/?api=1&query=Pesku%C5%A1a+9,+12318+Jo%C5%A1anica,+%C5%BDagubica,+Serbia",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 44.254722,
          "longitude": 21.782500
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Peskuša 9",
          "addressLocality": "Jošanica",
          "addressRegion": "Homolje, Opština Žagubica",
          "postalCode": "12318",
          "addressCountry": "RS"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "opens": "08:00",
            "closes": "19:00"
          }
        ],
        "founder": {
          "@type": "Person",
          "name": "Tanja Petrić",
          "jobTitle": "Majstor ručnih radova, tradicije i narodne nošnje",
          "knowsAbout": [
            "Tradicionalni srpski i vlaški vez",
            "Pletenje vune na 5 igala",
            "Izrada bele vlaške šubare od prirodnog krzna",
            "Narodna nošnja Homolja i KUD koreografije",
            "Makrame i heklani etno aksesoari"
          ]
        },
        "award": [
          "Sertifikat i status očuvanja starih i tradicionalnih zanata",
          "Zvanični izlagač Međunarodnog sajma turizma u Beogradu",
          "Višegodišnji laureat smotre Homoljski motivi Kučevo",
          "Glavni izlagač Sabora Vrela Homolja Žagubica"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+381603318319",
          "contactType": "customer service",
          "areaServed": ["RS", "BA", "ME", "DE", "AT", "CH", "US", "CA", "AU"],
          "availableLanguage": ["Serbian", "English", "German"]
        },
        "sameAs": [
          "https://www.instagram.com/savremenikoreni",
          "https://www.instagram.com/tanja.petric_",
          "https://www.facebook.com/share/1CFPeuE1Zf/",
          "https://pin.it/68KvVdZrn",
          "https://www.tiktok.com/@tanja53c"
        ],
        "areaServed": ["Srbija", "Crna Gora", "Bosna i Hercegovina", "Dijaspora", "Nemačka", "Austrija", "Švajcarska", "SAD", "Kanada", "Australija"]
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        "url": BASE_URL,
        "name": "Savremeni Koreni",
        "publisher": { "@id": `${BASE_URL}/#organization` }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${BASE_URL}/#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Savremeni Koreni",
            "item": BASE_URL
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Katalog Proizvoda",
            "item": `${BASE_URL}/#katalog`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Kolekcija Homolje",
            "item": `${BASE_URL}/kolekcija`
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "Galerija",
            "item": `${BASE_URL}/galerija`
          }
        ]
      },
      {
        "@type": "ItemList",
        "@id": `${BASE_URL}/#catalog-items`,
        "name": "Savremeni Koreni - Katalog autentičnih rukotvorina (47 proizvoda)",
        "numberOfItems": permanentProductsData.length,
        "itemListElement": permanentProductsData.map((p, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "item": {
            "@type": "Product",
            "@id": `${BASE_URL}/?proizvod=${p.id}`,
            "name": p.name,
            "description": p.description ? p.description.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
            "image": `${BASE_URL}${p.image.startsWith('/') ? '' : '/'}${p.image}`,
            "category": p.category,
            "brand": {
              "@type": "Brand",
              "name": "Savremeni Koreni"
            },
            "offers": {
              "@type": "Offer",
              "url": `${BASE_URL}/?proizvod=${p.id}`,
              "priceCurrency": "RSD",
              "price": p.priceRsd,
              "itemCondition": "https://schema.org/NewCondition",
              "availability": p.inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
              "seller": {
                "@type": "Organization",
                "name": "Savremeni Koreni"
              }
            }
          }
        }))
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE_URL}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Koja je kulturna i etnološka vrednost (heritage value) unikatnih rukotvorina iz Homolja?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Rukotvorine radionice Savremeni Koreni iz Homolja predstavljaju autentično nematerijalno kulturno nasleđe istočne Srbije. Svaki komad (vezene vunene čarape, narodna nošnja, vlaška šubara) izrađuje se tradicionalnim arhaičnim tehnikama: pletenjem na 5 igala, tradicionalnim punim vezom i pokrsticom. Kao unikati izrađeni bez industrijskih mašina, ovi predmeti nose energetski pečat majstora Tanje Petrić i predstavljaju trajnu porodičnu dragocenost (heirloom) čija vrednost raste kroz generacije."
            }
          },
          {
            "@type": "Question",
            "name": "Šta simbolizuju tradicionalni ornamenti i motivi na vezenim vunenim čarapama?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Geometrijski i floralni motivi na homoljskim vezenim čarapama nose viševekovnu zaštitnu i obrednu simboliku: romboidni i prepleteni oblici simbolišu plodnost tla, snagu doma i zaštitu od uroka, dok floralni motivi (homoljski božur, ružice, stilizovane lozice) označavaju zdravlje, lepotu i radost življenja. U srpskoj i vlaškoj tradiciji, vezene čarape su bile statusni simbol i neizostavan deo devojačke spreme."
            }
          },
          {
            "@type": "Question",
            "name": "Zašto je ručno pletenje vune na 5 igala kvalitetnije i dugovečnije od mašinske izrade?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Pletenje na 5 igala omogućava bešavno kružno formiranje čarape koje savršeno anatomski prianja uz stopalo i zglob bez zatezanja i usecanja. Ručna kontrola zategnutosti prediva čuva elastičnost vunenih vlakana, omogućava veću gustinu petlji i višestruko veću otpornost na habanje u poređenju sa fabrički sečenim i šivenim trikotažnim proizvodima."
            }
          },
          {
            "@type": "Question",
            "name": "Od koje se vune izrađuju proizvodi i koje su prirodne prednosti 100% domaće vune?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "U radionici Savremeni Koreni koristi se isključivo 100% prirodna domaća ovčija i jagnjeća vuna sa obronaka Homoljskih planina. Prirodna vuna je savršen termoregulator koji greje zimi i omogućava koži da diše bez znojenja, prirodno sadrži lanolin koji odbija prljavštinu i ima antibakterijska svojstva, hipoalergena je i potpuno ekološki biorazgradiva."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se pravilno peru proizvodi od 100% prirodne vune i ručni vez da se ne skupe?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vuneni ručni radovi peru se isključivo ručno u mlakoj vodi temperature do 30°C uz blagi tečni deterdžent za vunu sa lanolinom ili blagi dečiji šampon. Vuna se lagano potapa i gnječi bez agresivnog trljanja, uvrtanja ili mašinske centrifuge. Ispiranje se vrši vodom iste temperature kako bi se izbegao termički šok koji izaziva skupljanje, a višak vode se upija umotavanjem u suv pamučni peškir."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se pravilno suše i oblikuju ručno pletene vunene čarape?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ručno pletene čarape i vuneni odevni predmeti suše se isključivo položeni horizontalno na ravnoj podlozi preko suve pamučne krpe ili peškira, na sobnoj temperaturi i promaji. Strogo je zabranjeno sušenje na radijatoru, grejalici, u mašini za sušenje veša ili kačenje štipaljkama na žicu, jer težina vlage može trajno deformisati kroj."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se čuva prirodna vuna i štiti od moljaca bez hemije?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vuneni predmeti se pre odlaganja moraju potpuno osušiti i provetriti, a zatim čuvati u platnenim pamučnim vrećicama. Najbolja prirodna zaštita od moljaca su sušeni cvetovi prave lavande, pločice ili strugotina od kedrovog drveta, kora divljeg kestena i grančice ruzmarina, koji štite tkaninu i daju prijatan prirodan miris bez štetnog naftalina."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se održava i čisti bela vlaška šubara od prirodnog ovčijeg krzna?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Vlaška šubara od prirodnog krzna se nikada ne pere u vodi niti nosi na hemijsko čišćenje. Održava se redovnim provetravanjem na svežem vazduhu i povremenim nežnim iščešljavanjem mekom četkom za krzno u pravcu prirodnog pada dlake. Ako se pokvasi na snegu ili kiši, dovoljno je otresti kapljice i ostaviti je da se prirodno osuši na okruglom kalupu koji čuva njenu formu."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se peglaju odevni predmeti sa reljefnim ručnim vezom?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ručni vez se nikada ne pegla direktno sa lica jer bi vrela ploča pegle spljoštila reljefni bod i uništila sjaj pamučnog i svilenog konca. Peglanje se obavlja isključivo sa naličja (sa unutrašnje strane), preko vlažne pamučne gaze, na mekanoj podlozi (presavijeni peškir), uz umerenu temperaturu pegle i blagu paru."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se naručuju unikatne vezene čarape za folklor i nošnja po meri?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Čarape i nošnja se naručuju po tačnim merama vašeg stopala, dužine lista i sa specifičnim motivom vašeg folklornog ansambla (KUD-a) ili zavičajnog kraja. Porudžbina se vrši putem sajta, telefona ili WhatsApp/Viber poruke, a rok izrade unikatnog para iznosi 5 do 14 radnih dana."
            }
          },
          {
            "@type": "Question",
            "name": "Kako se vrši isporuka za dijasporu (Nemačka, Austrija, Švajcarska, SAD, Australija)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Za dijasporu i inostranstvo pakete šaljemo međunarodnom preporučenom avio-poštom (Post of Serbia International) ili DHL Express kurirskom službom, uz prateći broj za praćenje (tracking code) i bezbedno transportno pakovanje prilagođeno dugim relacijama."
            }
          },
          {
            "@type": "Question",
            "name": "Koji su načini plaćanja dostupni za kupce iz Srbije i inostranstva?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Kupci iz Srbije mogu platiti pouzećem u gotovini pri preuzimanju, e-banking uplatom na račun ili IPS QR kodom. Kupci iz dijaspore i inostranstva mogu bezbedno platiti platnim karticama (Visa, Mastercard, Maestro, Dina, Amex) i putem PayPal servisa."
            }
          },
          {
            "@type": "Question",
            "name": "Gde se nalazi radionica Savremeni Koreni?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Radionica Savremeni Koreni nalazi se u selu Jošanica (Peskuša 9, opština Žagubica, Homoljski okrug, istočna Srbija, GPS: 44.2547, 21.7825), gde Tanja Petrić ručno stvara svaki autorski rad u duhu tradicije. Posete su omogućene uz prethodnu najavu."
            }
          },
          {
            "@type": "Question",
            "name": "Kako prepoznati autentičan ručni rad i originalni homoljski motiv u odnosu na industrijske kopije?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Autentičan ručni rad radionice Savremeni Koreni prepoznaje se po gustini i teksturi pletiva (pletenje na 5 igala), bogatstvu reljefnog veza koji nije savršeno simetričan kao mašinski, i korišćenju 100% prirodne domaće vune. Svaki komad nosi specifične lokalne ornamente koji se ne mogu verno replicirati mašinama, što ih čini trajnim kulturnim nasleđem i dragocenim (heirloom) primerkom."
            }
          },
          {
            "@type": "Question",
            "name": "Koliko vremena je potrebno za izradu jednog autentičnog para vezenih vunenih čarapa?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Izrada jednog para originalnih homoljskih čarapa zahteva između 5 i 7 dana posvećenog manuelnog rada. Proces obuhvata ručno pletenje osnove od čiste domaće vune na pet igala, a zatim višednevni, precizan ručni vez koji zahteva izuzetnu veštinu i poznavanje tradicionalne ornamentike nasleđene od predaka."
            }
          },
          {
            "@type": "Question",
            "name": "Da li se ručno pleteni vuneni proizvodi smeju nositi na hemijsko čišćenje?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Hemijsko čišćenje se strogo ne preporučuje za autentične vunene rukotvorine. Agresivne hemikalije trajno uništavaju prirodni lanolin u vuni, isušuju vlakna i dovode do gubitka elastičnosti i termoizolacionih svojstava. Preporučuje se isključivo blago ručno pranje u mlakoj vodi (do 30°C)."
            }
          },
          {
            "@type": "Question",
            "name": "Kako povratiti mekoću vunenim čarapama ukoliko postanu grube usled dugotrajnog nošenja?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Da bi prirodna vuna zadržala ili povratila mekoću, nakon pranja ih možete potopiti 15 minuta u rastvor mlake vode sa malo regeneratora za kosu ili kašike belog alkoholnog sirćeta. Ovi tretmani opuštaju vlakna i vraćaju vuni elastičnost bez oštećenja tradicionalnog veza."
            }
          }
        ]
      }
    ]
  };
}

export function generateNoscriptHtml(): string {
  const productsHtml = permanentProductsData.map((p) => {
    const title = p.name;
    const desc = p.description ? p.description.replace(/\n+/g, ' ') : '';
    const price = `${p.priceRsd} RSD`;
    const img = `${BASE_URL}${p.image.startsWith('/') ? '' : '/'}${p.image}`;
    const url = `${BASE_URL}/?proizvod=${p.id}`;
    return `
      <article style="border: 1px solid #E8E0D5; background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 16px; align-items: flex-start;">
        <img src="${img}" alt="${title} - Savremeni Koreni Homolje" width="120" height="120" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #E8E0D5;" />
        <div>
          <h3 style="font-family: 'Marcellus', serif; font-size: 18px; margin: 0 0 6px 0; color: #241D19;">
            <a href="${url}" style="color: #9E3E26; text-decoration: none;">${title}</a>
          </h3>
          <p style="font-size: 13px; color: #52433B; margin: 0 0 8px 0; line-height: 1.5;">${desc}</p>
          <div style="font-size: 14px; font-weight: bold; color: #241D19;">
            Cena: <span style="color: #9E3E26;">${price}</span> | Kategorija: <span>${p.category}</span> | Stanje: <span>${p.inStock ? 'Na stanju' : 'Izrada po meri'}</span>
          </div>
        </div>
      </article>`;
  }).join('\n');

  return `
    <!-- FAQ Accordion & 47 Products Catalog Fallback for SEO Crawlers & No-JS Viewers -->
    <noscript>
      <section id="static-seo-catalog" style="max-width: 900px; margin: 30px auto; padding: 24px; background-color: #ffffff; border: 1px solid #E8E0D5; border-radius: 16px; font-family: 'Plus Jakarta Sans', sans-serif;">
        <h2 style="font-family: 'Marcellus', serif; font-size: 24px; font-weight: bold; color: #241D19; border-bottom: 2px solid #9E3E26; padding-bottom: 10px; margin-bottom: 20px;">
          Katalog Autentičnih Proizvoda (47 Unikata) - Savremeni Koreni Homolje
        </h2>
        <div style="display: flex; flex-direction: column;">
          ${productsHtml}
        </div>

        <h2 style="font-family: 'Marcellus', serif; font-size: 24px; font-weight: bold; color: #241D19; border-bottom: 2px solid #9E3E26; padding-bottom: 10px; margin: 30px 0 20px 0;">
          Često Postavljana Pitanja (FAQ Vodič &amp; Uputstvo za Negu) - Savremeni Koreni
        </h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Koja je kulturna i etnološka vrednost (heritage value) unikatnih rukotvorina iz Homolja?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Rukotvorine radionice Savremeni Koreni iz Homolja predstavljaju autentično nematerijalno kulturno nasleđe istočne Srbije. Svaki komad (vezene vunene čarape, narodna nošnja, vlaška šubara) izrađuje se tradicionalnim arhaičnim tehnikama: pletenjem na 5 igala, tradicionalnim punim vezom i pokrsticom. Kao unikati izrađeni bez industrijskih mašina, ovi predmeti nose energetski pečat majstora Tanje Petrić i predstavljaju trajnu porodičnu dragocenost (heirloom) čija vrednost raste kroz generacije.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Šta simbolizuju tradicionalni ornamenti i motivi na vezenim vunenim čarapama?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Geometrijski i floralni motivi na homoljskim vezenim čarapama nose viševekovnu zaštitnu i obrednu simboliku: romboidni i prepleteni oblici simbolišu plodnost tla, snagu doma i zaštitu od uroka, dok floralni motivi (homoljski božur, ružice, stilizovane lozice) označavaju zdravlje, lepotu i radost življenja. U srpskoj i vlaškoj tradiciji, vezene čarape su bile statusni simbol i neizostavan deo devojačke spreme.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Zašto je ručno pletenje vune na 5 igala kvalitetnije i dugovečnije od mašinske izrade?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Pletenje na 5 igala omogućava bešavno kružno formiranje čarape koje savršeno anatomski prianja uz stopalo i zglob bez zatezanja i usecanja. Ručna kontrola zategnutosti prediva čuva elastičnost vunenih vlakana, omogućava veću gustinu petlji i višestruko veću otpornost na habanje u poređenju sa fabrički sečenim i šivenim trikotažnim proizvodima.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Od koje se vune izrađuju proizvodi i koje su prirodne prednosti 100% domaće vune?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              U radionici Savremeni Koreni koristi se isključivo 100% prirodna domaća ovčija i jagnjeća vuna sa obronaka Homoljskih planina. Prirodna vuna je savršen termoregulator koji greje zimi i omogućava koži da diše bez znojenja, prirodno sadrži lanolin koji odbija prljavštinu i ima antibakterijska svojstva, hipoalergena je i potpuno ekološki biorazgradiva.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se pravilno peru proizvodi od 100% prirodne vune i ručni vez da se ne skupe?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Vuneni ručni radovi peru se isključivo ručno u mlakoj vodi temperature do 30°C uz blagi tečni deterdžent za vunu sa lanolinom ili blagi dečiji šampon. Vuna se lagano potapa i gnječi bez agresivnog trljanja, uvrtanja ili mašinske centrifuge. Ispiranje se vrši vodom iste temperature kako bi se izbegao termički šok koji izaziva skupljanje, a višak vode se upija umotavanjem u suv pamučni peškir.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se pravilno suše i oblikuju ručno pletene vunene čarape?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Ručno pletene čarape i vuneni odevni predmeti suše se isključivo položeni horizontalno na ravnoj podlozi preko suve pamučne krpe ili peškira, na sobnoj temperaturi i promaji. Strogo je zabranjeno sušenje na radijatoru, grejalici, u mašini za sušenje veša ili kačenje štipaljkama na žicu, jer težina vlage može trajno deformisati kroj.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se čuva prirodna vuna i štiti od moljaca bez hemije?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Vuneni predmeti se pre odlaganja moraju potpuno osušiti i provetriti, a zatim čuvati u platnenim pamučnim vrećicama. Najbolja prirodna zaštita od moljaca su sušeni cvetovi prave lavande, pločice ili strugotina od kedrovog drveta, kora divljeg kestena i grančice ruzmarina, koji štite tkaninu i daju prijatan prirodan miris bez štetnog naftalina.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se održava i čisti bela vlaška šubara od prirodnog ovčijeg krzna?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Vlaška šubara od prirodnog krzna se nikada ne pere u vodi niti nosi na hemijsko čišćenje. Održava se redovnim provetravanjem na svežem vazduhu i povremenim nežnim iščešljavanjem mekom četkom za krzno u pravcu prirodnog pada dlake. Ako se pokvasi na snegu ili kiši, dovoljno je otresti kapljice i ostaviti je da se prirodno osuši na okruglom kalupu koji čuva njenu formu.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se peglaju odevni predmeti sa reljefnim ručnim vezom?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Ručni vez se nikada ne pegla direktno sa lica jer bi vrela ploča pegle spljoštila reljefni bod i uništila sjaj pamučnog i svilenog konca. Peglanje se obavlja isključivo sa naličja (sa unutrašnje strane), preko vlažne pamučne gaze, na mekanoj podlozi (presavijeni peškir), uz umerenu temperaturu pegle i blagu paru.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se naručuju unikatne vezene čarape za folklor i nošnja po meri?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Čarape i nošnja se naručuju po tačnim merama vašeg stopala, dužine lista i sa specifičnim motivom vašeg folklornog ansambla (KUD-a) ili zavičajnog kraja. Porudžbina se vrši putem sajta, telefona ili WhatsApp/Viber poruke, a rok izrade unikatnog para iznosi 5 do 14 radnih dana.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako se vrši isporuka za dijasporu (Nemačka, Austrija, Švajcarska, SAD, Australija)?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Za dijasporu i inostranstvo pakete šaljemo međunarodnom preporučenom avio-poštom (Post of Serbia International) ili DHL Express kurirskom službom, uz prateći broj za praćenje (tracking code) i bezbedno transportno pakovanje prilagođeno dugim relacijama.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Koji su načini plaćanja dostupni za kupce iz Srbije i inostranstva?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Kupci iz Srbije mogu platiti pouzećem u gotovini pri preuzimanju, e-banking uplatom na račun ili IPS QR kodom. Kupci iz dijaspore i inostranstva mogu bezbedno platiti platnim karticama (Visa, Mastercard, Maestro, Dina, Amex) i putem PayPal servisa.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Gde se nalazi radionica Savremeni Koreni?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Radionica Savremeni Koreni nalazi se u selu Jošanica (Peskuša 9, opština Žagubica, Homoljski okrug, istočna Srbija, GPS: 44.2547, 21.7825), gde Tanja Petrić ručno stvara svaki autorski rad u duhu tradicije. Posete su omogućene uz prethodnu najavu.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako prepoznati autentičan ručni rad i originalni homoljski motiv u odnosu na industrijske kopije?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Autentičan ručni rad radionice Savremeni Koreni prepoznaje se po gustini i teksturi pletiva (pletenje na 5 igala), bogatstvu reljefnog veza koji nije savršeno simetričan kao mašinski, i korišćenju 100% prirodne domaće vune. Svaki komad nosi specifične lokalne ornamente koji se ne mogu verno replicirati mašinama, što ih čini trajnim kulturnim nasleđem i dragocenim (heirloom) primerkom.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Koliko vremena je potrebno za izradu jednog autentičnog para vezenih vunenih čarapa?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Izrada jednog para originalnih homoljskih čarapa zahteva između 5 i 7 dana posvećenog manuelnog rada. Proces obuhvata ručno pletenje osnove od čiste domaće vune na pet igala, a zatim višednevni, precizan ručni vez koji zahteva izuzetnu veštinu i poznavanje tradicionalne ornamentike nasleđene od predaka.
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Da li se ručno pleteni vuneni proizvodi smeju nositi na hemijsko čišćenje?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Hemijsko čišćenje se strogo ne preporučuje za autentične vunene rukotvorine. Agresivne hemikalije trajno uništavaju prirodni lanolin u vuni, isušuju vlakna i dovode do gubitka elastičnosti i termoizolacionih svojstava. Preporučuje se isključivo blago ručno pranje u mlakoj vodi (do 30°C).
            </p>
          </details>

          <details style="border: 1px solid #E8E0D5; background: #FAF7F2; border-radius: 12px; padding: 14px 18px; cursor: pointer;">
            <summary style="font-weight: bold; color: #241D19; font-size: 15px;">Kako povratiti mekoću vunenim čarapama ukoliko postanu grube usled dugotrajnog nošenja?</summary>
            <p style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E8E0D5; color: #382C24; font-size: 14px; line-height: 1.6;">
              Da bi prirodna vuna zadržala ili povratila mekoću, nakon pranja ih možete potopiti 15 minuta u rastvor mlake vode sa malo regeneratora za kosu ili kašike belog alkoholnog sirćeta. Ovi tretmani opuštaju vlakna i vraćaju vuni elastičnost bez oštećenja tradicionalnog veza.
            </p>
          </details>
        </div>

        <!-- E-E-A-T & Local Business Schema Summary -->
        <div style="margin-top: 24px; padding: 18px; background: #FAF7F2; border-radius: 12px; border: 1px solid #E8E0D5; font-size: 13px; color: #382C24; line-height: 1.6;">
          <h3 style="font-family: 'Marcellus', serif; font-size: 18px; font-weight: bold; color: #241D19; margin-bottom: 8px;">
            Atelje Savremeni Koreni • Homolje, Žagubica (E-E-A-T Sertifikati &amp; Znak Kvaliteta)
          </h3>
          <p>
            <strong>Adresa radionice:</strong> Peskuša 9, 12318 Jošanica, Opština Žagubica, Srbija (GPS: 44.254722, 21.782500)<br />
            <strong>Pravni podaci:</strong> TANjA PETRIĆ PR PROIZVODNjA OSTALIH TEKSTILNIH PREDMETA SAVREMENI KORENI JOŠANICA | PIB: 115789396 | MB: 68635870 | Šifra delatnosti: 1399<br />
            <strong>Priznanja i učešća:</strong> Znak tradicionalnog zanata, Međunarodni sajam turizma u Beogradu, Smotra "Homoljski motivi" Kučevo, Sabor "Vrela Homolja" Žagubica.<br />
            <strong>Telefon / WhatsApp:</strong> +381 60 331 8319 | <strong>Email:</strong> savremenikoreni@gmail.com | <strong>Radno vreme:</strong> Pon - Sub: 08:00 - 19:00
          </p>
        </div>
      </section>
    </noscript>`;
}

async function run() {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace <script type="application/ld+json">...</script>
  const schemaJson = JSON.stringify(getFullStructuredData(), null, 2);
  const schemaBlock = `<script type="application/ld+json">\n${schemaJson}\n    </script>`;

  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schemaBlock);

  // Replace <noscript>...</noscript>
  const noscriptBlock = generateNoscriptHtml().trim();
  html = html.replace(/<!-- FAQ Accordion Fallback[\s\S]*?<\/noscript>|<!-- FAQ Accordion & 47 Products[\s\S]*?<\/noscript>|<noscript>[\s\S]*?<\/noscript>/, noscriptBlock);

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✅ Successfully injected 47 products + Organization + Breadcrumb + FAQ into index.html');
}

run();
