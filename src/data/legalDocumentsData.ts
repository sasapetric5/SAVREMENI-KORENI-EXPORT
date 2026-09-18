import { companyDetails } from './companyData';

export type LegalDocTab = 'privacy' | 'terms' | 'cookies' | 'returns' | 'impresum';

export interface LegalDocumentSection {
  title: string;
  titleEn: string;
  content: string[];
  contentEn: string[];
}

export interface LegalDocument {
  id: LegalDocTab;
  title: string;
  titleEn: string;
  iconName: string;
  lastUpdated: string;
  lastUpdatedEn: string;
  summary: string;
  summaryEn: string;
  sections: LegalDocumentSection[];
}

export const legalDocumentsData: Record<LegalDocTab, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Politika Privatnosti',
    titleEn: 'Privacy Policy',
    iconName: 'ShieldCheck',
    lastUpdated: '18. septembar 2026.',
    lastUpdatedEn: 'September 18, 2026',
    summary: 'Objašnjenje kako radionica "Savremeni Koreni" prikuplja, koristi, čuva i štiti Vaše lične podatke u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije i Opštom uredbom EU o zaštiti podataka (GDPR).',
    summaryEn: 'Explanation of how "Savremeni Koreni" atelier collects, uses, stores, and protects your personal data in accordance with the Law on Personal Data Protection of Serbia and EU GDPR regulations.',
    sections: [
      {
        title: '1. Rukovalac podacima i kontakt',
        titleEn: '1. Data Controller and Contact Information',
        content: [
          `Rukovalac Vašim podacima o ličnosti je samostalna zanatska radnja "${companyDetails.legalName}", sa sedištem na adresi ${companyDetails.address.street} ${companyDetails.address.number}, ${companyDetails.address.postalCode} ${companyDetails.address.city} (${companyDetails.address.municipality}), Republika Srbija.`,
          `PIB: ${companyDetails.pib} | Matični broj: ${companyDetails.maticniBroj}`,
          `E-pošta za pitanja o privatnosti i zaštiti podataka: ${companyDetails.email}`,
          `Kontakt telefon: ${companyDetails.phoneFormatted}`
        ],
        contentEn: [
          `The controller of your personal data is the independent craft shop "${companyDetails.legalName}", headquartered at ${companyDetails.address.street} ${companyDetails.address.number}, ${companyDetails.address.postalCode} ${companyDetails.address.city} (${companyDetails.address.municipality}), Republic of Serbia.`,
          `Tax ID (PIB): ${companyDetails.pib} | Registration No. (MB): ${companyDetails.maticniBroj}`,
          `Privacy & Data Protection Email: ${companyDetails.email}`,
          `Contact Phone: ${companyDetails.phoneFormatted}`
        ]
      },
      {
        title: '2. Koje podatke prikupljamo i u koje svrhe',
        titleEn: '2. What Personal Data We Collect and Why',
        content: [
          'Prilikom naručivanja rukotvorina, nošnji ili slanja upita preko sajta, prikupljamo sledeće podatke:',
          '• Lični identifikacioni podaci: Ime, prezime i kontakt telefon.',
          '• Podaci za dostavu: Adresa stanovanja ili adresa za isporuku (ulica, broj, grad, poštanski broj i država).',
          '• Elektronska pošta (E-mail): Za slanje potvrde narudžbine, broja za praćenje pošiljke (Post Express / DHL / FedEx) i komunikaciju u vezi sa izradom po meri.',
          '• Merni podaci (opciono za odeću po meri): Obim grudi, struka, dužina leđa i veličina obuče/šubare radi preciznog krojenja.',
          '• Tehnički podaci: IP adresa, tip pregledača i izabrana valuta/jezik radi tehničkog funkcionisanja sajta i bezbednosti.'
        ],
        contentEn: [
          'When ordering handmade goods, folk costumes, or submitting inquiries on our site, we collect the following data:',
          '• Personal identification: First name, last name, and contact telephone number.',
          '• Shipping details: Street address, building/apartment number, postal code, city, and destination country.',
          '• Email address: To dispatch order confirmations, tracking codes (Post Express / DHL / FedEx), and updates regarding custom orders.',
          '• Custom tailoring measurements (optional): Chest, waist circumference, back length, shoe or head size for bespoke orders.',
          '• Technical data: IP address, browser type, preferred language and currency for website functionality and security.'
        ]
      },
      {
        title: '3. Pravni osnov i period čuvanja podataka',
        titleEn: '3. Legal Basis and Data Retention Period',
        content: [
          'Pravni osnov za obradu je izvršenje ugovora o kupoprodaji robe na daljinu (član 12. st. 1. tač. 2 ZZPL RS) i ispunjavanje zakonskih poresko-finansijskih obaveza.',
          'Podaci o izvršenim kupovinama čuvaju se u roku propisanom Zakonom o računovodstvu i poreskim propisima Republike Srbije (do 5 do 10 godina za knjigovodstvene isprave).',
          'Podaci iz kontakt formi i upita čuvaju se do završetka komunikacije ili dok ne zatražite njihovo brisanje.'
        ],
        contentEn: [
          'The legal basis for processing is the performance of a distance sales contract (Art. 6(1)(b) GDPR) and fulfillment of statutory accounting and tax duties under Serbian law.',
          'Transaction and order invoices are retained for the period mandated by national tax laws (5 to 10 years for accounting books).',
          'General inquiry data is retained until communication is completed or until you request erasure.'
        ]
      },
      {
        title: '4. Deljenje podataka sa trećim licima',
        titleEn: '4. Third-Party Data Sharing',
        content: [
          'Vaše lične podatke striktno čuvamo i nikada ih ne prodajemo, ne iznajmljujemo niti ustupamo trećim licima u marketinške svrhe.',
          'Podatke delimo isključivo sa pouzdanim partnerima neophodnim za realizaciju Vaše kupovine:',
          '• Kurirske i poštanske službe (Post Express JP Pošta Srbije, Post Pak, DHL Express, FedEx) – isključivo ime, adresa i telefon radi isporuke.',
          '• Bankarske i procesorske ustanove (provisori platnih kartica) – za obradu bezbednih elektronskih plaćanja.',
          '• Nadležni državni organi – samo kada je to zakonska obaveza po nalogu suda ili poreskih organa R. Srbije.'
        ],
        contentEn: [
          'We strictly protect your data and never sell, rent, or trade your personal information to third parties for marketing purposes.',
          'Data is shared solely with trusted service providers essential to fulfilling your purchase:',
          '• Postal & Courier Services (Post Express Serbia, Post Pak, DHL Express, FedEx) – recipient name, address, and phone number exclusively for delivery.',
          '• Payment Processors & Banks – for processing secure online card payments.',
          '• Regulatory Authorities – strictly when required under enforceable legal obligations or court orders.'
        ]
      },
      {
        title: '5. Vaša prava u vezi sa ličnim podacima',
        titleEn: '5. Your Rights Regarding Personal Data',
        content: [
          'U svakom trenutku imate sledeća prava:',
          '• Pravo na pristup: Mogućnost da zatražite potvrdu da li obrađujemo Vaše podatke i kopiju istih.',
          '• Pravo na ispravku: Mogućnost da ispravite netačne ili dopunite nepotpune podatke.',
          '• Pravo na brisanje ("pravo na zaborav"): Mogućnost da zatražite brisanje Vaših podataka ukoliko ne postoji zakonska obaveza njihovog čuvanja.',
          '• Pravo na prigovor: Pravo da uložite prigovor Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti RS (www.poverenik.rs).',
          `Za ostvarivanje Vaših prava kontaktirajte nas putem e-pošte: ${companyDetails.email}`
        ],
        contentEn: [
          'You have the following rights at any time:',
          '• Right of access: Request confirmation of data processing and a copy of your personal data.',
          '• Right to rectification: Correct inaccurate or complete incomplete personal data.',
          '• Right to erasure ("right to be forgotten"): Request deletion of data where legal retention rules do not apply.',
          '• Right to lodge a complaint: Complain to the Commissioner for Information of Public Importance and Personal Data Protection of Serbia (www.poverenik.rs) or your local EU Data Protection Authority.',
          `To exercise your rights, please reach us at: ${companyDetails.email}`
        ]
      }
    ]
  },

  terms: {
    id: 'terms',
    title: 'Uslovi Korišćenja',
    titleEn: 'Terms of Service',
    iconName: 'FileText',
    lastUpdated: '18. septembar 2026.',
    lastUpdatedEn: 'September 18, 2026',
    summary: 'Opšti uslovi kupovine, naručivanja unikatnih rukotvorina, autorskih prava i garancija na internet prezentaciji savremenikoreni.com.',
    summaryEn: 'General terms of purchase, custom order fulfillment, intellectual property, and warranty policies for savremenikoreni.com.',
    sections: [
      {
        title: '1. Opšte odredbe',
        titleEn: '1. General Provisions',
        content: [
          `Ovi Uslovi korišćenja regulišu prava i obaveze između posetilaca/kupaca i radionice "${companyDetails.legalName}" (u daljem tekstu: Prodavac) prilikom pregleda i kupovine robe putem internet prezentacije savremenikoreni.com.`,
          'Korišćenjem sajta ili slanjem porudžbine, Kupac potvrđuje da je pročitao, razumeo i prihvatio ove Uslove u celosti.',
          'Prodavac zadržava pravo da promeni Uslove u bilo kom trenutku, pri čemu važe uslovi objavljeni na sajtu u trenutku slanja porudžbine.'
        ],
        contentEn: [
          `These Terms of Service govern the rights and obligations between visitors/buyers and "${companyDetails.legalName}" (hereinafter: Seller) during browsing and online purchasing via savremenikoreni.com.`,
          'By using the website or placing an order, the Buyer acknowledges having read, understood, and agreed to these Terms in full.',
          'The Seller reserves the right to amend these Terms at any time; terms active at the moment of order placement shall apply.'
        ]
      },
      {
        title: '2. Proizvodi i ručna izrada (Unikatnost)',
        titleEn: '2. Products and Artisan Handcrafting (Uniqueness)',
        content: [
          'Svi proizvodi u ponudi radionice "Savremeni Koreni" (šubare, vunene čarape, vezene košulje, jeleci, makrame torbe, etno nakit) izrađuju se ručno tradicionalnim tehnikama.',
          'Zbog prirodnih svojstava materijala (prirodna vuna, krzno, pamučno platno, drvo) i ručnog rada, moguća su minimalna odstupanja u nijansi boje ili sitnim detaljima veza u odnosu na fotografije na sajtu. Ova odstupanja predstavljaju dokaz autentičnog ručnog rada i unikatnosti komada.',
          'Za proizvode koji se izrađuju po porudžbini i meri kupca, rok izrade iznosi od 2 do 14 radnih dana, o čemu se Kupac obaveštava prilikom potvrde.'
        ],
        contentEn: [
          'All products offered by "Savremeni Koreni" studio (fur hats, knitted wool socks, embroidered folk shirts, vests, macramé bags, folk jewelry) are handcrafted using traditional heritage techniques.',
          'Due to the natural attributes of organic materials (natural fleece, fur, linen, wood) and artisan handwork, subtle variations in shade or embroidery detail compared to catalog photos may occur. These minor nuances testify to genuine handcrafting and unique artistry.',
          'For bespoke products tailored to customer measurements, creation times range from 2 to 14 business days, explicitly specified during order confirmation.'
        ]
      },
      {
        title: '3. Cene, valute i način plaćanja',
        titleEn: '3. Pricing, Currencies, and Payment Methods',
        content: [
          'Sve cene na sajtu su iskazane u Srpskim dinarima (RSD). Radi lakšeg uvida inostranih kupaca, cene se mogu prikazati i u Eurima (EUR) ili Američkim dolarima (USD) po važećem kursu.',
          'Plaćanje se vrši na sledeće načine:',
          '1) Pouzećem (gotovinski prilikom preuzimanja pošiljke od kurira) – dostupno za teritoriju Republike Srbije.',
          '2) Direktnom uplatom na tekući račun radionice na osnovu izdate predračuna/uplatnice.',
          '3) Platnim karticama / elektronskim putem (Visa, Mastercard, Maestro, DinaCard, PayPal / Stripe za inostrane kupce) – bezbedna enkriptovana naplata.'
        ],
        contentEn: [
          'All prices on the website are displayed in Serbian Dinars (RSD). For international visitors, approximate prices can be rendered in Euros (EUR) or US Dollars (USD).',
          'Payment options include:',
          '1) Cash on Delivery (COD) – available for deliveries within the Republic of Serbia.',
          '2) Direct Bank Wire Transfer to the official workshop bank account based on proforma invoice.',
          '3) Online Payment Cards / Electronic Transfer (Visa, Mastercard, Maestro, DinaCard, PayPal / Stripe for international orders) – secure encrypted checkout.'
        ]
      },
      {
        title: '4. Isporuka i troškovi dostave',
        titleEn: '4. Delivery and Shipping Costs',
        content: [
          'Isporuka na teritoriji Srbije vrši se kurirskom službom Post Express (JP Pošta Srbije) u roku od 1-3 radna dana od završetka izrade.',
          'Za kupce iz inostranstva (Dijaspora, EU, SAD, Kanada, Australija), isporuka se vrši putem međunarodne pošte PostPak ili brze pošte DHL / FedEx.',
          'Troškove dostave snosi Kupac prema važećem cenovniku kurirske službe, osim ako je naglašena akcija besplatne dostave.'
        ],
        contentEn: [
          'Domestic deliveries within Serbia are fulfilled via Post Express courier service within 1-3 business days after item crafting completion.',
          'International orders (Diaspora, EU, USA, Canada, Australia) are dispatched via international tracked mail PostPak or expedited DHL / FedEx.',
          'Shipping fees are calculated according to official courier rates and borne by the Buyer unless free shipping promotions apply.'
        ]
      },
      {
        title: '5. Intelektualna svojina i autorska prava',
        titleEn: '5. Intellectual Property Rights',
        content: [
          `Sav sadržaj na sajtu savremenikoreni.com, uključujući tekstove, fotografije radova, logo, grafička rešenja, nazive kolekcija i autorske dizajne veza, zaštićen je autorskim pravima i vlasništvo je radionice "${companyDetails.legalName}".`,
          'Zabranjeno je svako neovlašćeno preuzimanje, kopiranje, distribucija ili komercijalno korišćenje fotografija i tekstova bez pismene saglasnosti vlasnika.'
        ],
        contentEn: [
          `All materials on savremenikoreni.com, including text, photographs of artisan works, logo, graphic identity, collection titles, and proprietary embroidery patterns, are protected under copyright laws belonging to "${companyDetails.legalName}".`,
          'Unauthorized reproduction, distribution, hotlinking, or commercial use of our media assets without explicit written consent is strictly prohibited.'
        ]
      }
    ]
  },

  cookies: {
    id: 'cookies',
    title: 'Politika Kolačića',
    titleEn: 'Cookie Policy',
    iconName: 'Cookie',
    lastUpdated: '18. septembar 2026.',
    lastUpdatedEn: 'September 18, 2026',
    summary: 'Informacije o upotrebi kolačića (cookies) i lokalne memorije na našem sajtu radi pružanja brzog, bezbednog i personalizovanog korisničkog iskustva.',
    summaryEn: 'Detailed information regarding cookies and local storage usage on our website to ensure fast, secure, and tailored user browsing.',
    sections: [
      {
        title: '1. Šta su kolačići (Cookies)?',
        titleEn: '1. What Are Cookies?',
        content: [
          'Kolačić (cookie) je mala tekstualna datoteka koja se skladišti na Vašem računaru, mobilnom telefonu ili tabletu prilikom posete internet stranici.',
          'Kolačići omogućavaju sajtu da zapamti Vaše podešavanje (poput izabranog jezika, valute ili sadržaja korpe za kupovinu) kako ih ne biste morali ponovo unositi prilikom svake posete.'
        ],
        contentEn: [
          'A cookie is a small text file stored on your computer, mobile device, or tablet when visiting a website.',
          'Cookies allow the website to remember your actions and preferences (such as selected language, currency, or shopping cart items) over a period of time.'
        ]
      },
      {
        title: '2. Vrste kolačića koje koristimo',
        titleEn: '2. Types of Cookies We Utilize',
        content: [
          'Na sajtu savremenikoreni.com koristimo sledeće kategorije kolačića:',
          '1. Neophodni (Esencijalni) kolačići: Neophodni su za rad sajta, navigaciju, rad korpe i bezbednost. Ovi kolačići ne skladište lične identifikacione podatke i ne mogu se isključiti.',
          '2. Funkcionalni kolačići: Omogućavaju pamćenje Vaših izbora poput izabranog jezika (Srpski / Engleski) i valute (RSD / EUR / USD).',
          '3. Analitički kolačići: Pomažu nam da razumemo kako posetioci koriste sajt (broj poseta, najgledaniji proizvodi, brzina učitavanja) radi unapređenja performansi.',
          '4. Marketinški kolačići: Služe za prikazivanje relevantnih obaveštenja o novim kolekcijama i promocijama rukotvorina.'
        ],
        contentEn: [
          'On savremenikoreni.com we use the following categories of cookies:',
          '1. Essential (Strictly Necessary) Cookies: Required for core website operation, shopping cart memory, and security. They cannot be disabled in our systems.',
          '2. Preferences & Functional Cookies: Allow the site to remember your explicit settings such as language (SR / EN) and display currency (RSD / EUR / USD).',
          '3. Analytics Cookies: Assist us in measuring visitor traffic, top viewed artisan items, and loading speeds to optimize user experience.',
          '4. Marketing Cookies: Used to share relevant updates regarding new artisan collections and heritage craftsmanship fairs.'
        ]
      },
      {
        title: '3. Upravljanje kolačićima i saglasnost',
        titleEn: '3. Cookie Consent and Management',
        content: [
          'Prilikom prve posete sajtu prikazuje se baner za saglasnost na kolačiće gde možete prihvatiti sve kolačiće, izabrati samo esencijalne ili prilagoditi podešavanja.',
          'U svakom trenutku možete promeniti svoje opcije klikom na link "Podešavanje kolačića" u podnožju (footer-u) sajta.',
          'Takođe, možete obrisati ili blokirati kolačiće direktno u podešavanjima Vašeg internet pregledača (Chrome, Firefox, Safari, Edge).'
        ],
        contentEn: [
          'Upon your first visit, a cookie consent banner allows you to Accept All, Accept Essential Only, or Customize your cookie settings.',
          'You may modify your preferences at any time by clicking the "Cookie Settings" link located in the website footer.',
          'Furthermore, you can manage or delete cookies directly within your web browser settings (Chrome, Firefox, Safari, Edge).'
        ]
      }
    ]
  },

  returns: {
    id: 'returns',
    title: 'Politika Povraćaja i Reklamacija',
    titleEn: 'Return & Refund Policy',
    iconName: 'RotateCcw',
    lastUpdated: '18. septembar 2026.',
    lastUpdatedEn: 'September 18, 2026',
    summary: 'Informacije o zakonskom pravu na odustanak od ugovora u roku od 14 dni, proceduri reklamacije i garanciji kvaliteta ručno izrađenih proizvoda.',
    summaryEn: 'Information regarding the 14-day statutory right of withdrawal, warranty procedures, and returns for handcrafted products under Consumer Protection Law.',
    sections: [
      {
        title: '1. Pravo na odustanak od ugovora (Rok od 14 dana)',
        titleEn: '1. Statutory Right of Withdrawal (14-Day Guarantee)',
        content: [
          'U skladu sa Zakonom o zaštiti potrošača Republike Srbije (Sl. glasnik RS br. 88/2021), Kupac koji se smatra potrošačem ima pravo da odustane od ugovora zaključenog na daljinu u roku od 14 dana od dana kada mu je roba uručena, bez navođenja razloga.',
          'Da bi ostvario pravo na odustanak, Kupac je dužan da u navedenom roku pošalje pisano obaveštenje (Obrazac za odustanak ili e-mail) na adresu: savremenikoreni@gmail.com.',
          'Proizvod mora biti vraćen neoštećen, neposmatran, nekorišćen, u originalnom pakovanju i sa svim pratećim etiketama i računom.'
        ],
        contentEn: [
          'In compliance with the Consumer Protection Law of the Republic of Serbia, buyers ordering online have the right to cancel their distance contract within 14 calendar days from product receipt without providing a reason.',
          'To exercise this right, the Buyer must notify us in writing via email at: savremenikoreni@gmail.com within the 14-day window.',
          'Returned goods must be unused, undamaged, unworn, in original condition, and sent with all labels and proof of purchase intact.'
        ]
      },
      {
        title: '2. Izuzeci od prava na odustanak (Izrada po meri)',
        titleEn: '2. Exceptions to Right of Withdrawal (Custom Made Goods)',
        content: [
          'U skladu sa članom 36. tačka 3. Zakona o zaštiti potrošača, pravo na odustanak izuzeto je za proizvode koji su izrađeni prema posebnim specifikacijama potrošača ili su jasno personalizovani.',
          'To obuhvata: unikatne nošnje ili jeleke šivene po tačnim dimenzijama kupca, vezene košulje sa posvetom ili po meri, kao i unikatne predmete rađene po posebnoj želji naručioca.',
          'U slučaju uočene nesaobraznosti ili greške u izradi sa naše strane, naravno važi puna garancija i besplatna dorada ili zamena.'
        ],
        contentEn: [
          'Pursuant to Consumer Protection Law regulations, the right of cancellation does NOT apply to goods made to consumer specifications or clearly personalized.',
          'This includes: traditional vests or costumes tailored to customer custom measurements, bespoke embroidered shirts with custom monograms, or personalized folk artwork.',
          'However, if any tailoring flaw or defect occurs on our part, full warranty repair, adjustment, or replacement is guaranteed at zero cost.'
        ]
      },
      {
        title: '3. Procedura reklamacije i povraćaja novca',
        titleEn: '3. Complaint Procedure and Refunds',
        content: [
          'Ukoliko primite proizvod sa nedostatkom ili oštećenjem nastalim u transportu, molimo Vas da nas obavestite u roku od 24h od prijema sa fotografijom oštećenja.',
          'Prodavac je dužan da odgovori na reklamaciju u roku od 8 dana od prijema pisane reklamacije.',
          'Nakon opravdanog odustanka ili prihvaćene reklamacije, Prodavac će izvršiti povraćaj uplaćenih sredstava u roku od najkasnije 14 dni od dana prijema vraćene robe na adresu radionice.',
          'Direktne troškove vraćanja robe snosi Kupac, osim u slučaju prihvaćene reklamacije usled greške Prodavca.'
        ],
        contentEn: [
          'Should you receive an item with manufacturing defects or transit damage, please inform us within 24 hours of receipt alongside photos of the issue.',
          'The Seller shall formally respond to complaints within 8 days of written receipt.',
          'Upon approved return or valid warranty claim, funds will be refunded using the original payment channel within 14 days of physical return verification.',
          'Direct return shipping charges are borne by the Buyer unless the return stems from a seller dispatch error.'
        ]
      }
    ]
  },

  impresum: {
    id: 'impresum',
    title: 'Impresum i Pravni Podaci',
    titleEn: 'Impressum & Legal Information',
    iconName: 'Building2',
    lastUpdated: '18. septembar 2026.',
    lastUpdatedEn: 'September 18, 2026',
    summary: 'Službeni zvanični podaci o registraciji privrednog subjekta u Agenciji za privredne registre (APR) Republike Srbije i kontakt podaci radionice.',
    summaryEn: 'Official business registration details registered with the Serbian Business Registers Agency (SBRA/APR) and studio contact info.',
    sections: [
      {
        title: '1. Zvanični registarski podaci (APR RS)',
        titleEn: '1. Official Registration Details (APR Serbia)',
        content: [
          `Puni poslovni naziv: ${companyDetails.legalName}`,
          `Skraćeno poslovno ime: ${companyDetails.shortName}`,
          `Komercijalni naziv brenda: ${companyDetails.brandName}`,
          `Vlasnik / Preduzetnik: ${companyDetails.owner}`,
          `Poreski identifikacioni broj (PIB): ${companyDetails.pib}`,
          `Matični broj (MB): ${companyDetails.maticniBroj}`,
          `Šifra delatnosti: ${companyDetails.activityCode} – ${companyDetails.activityName}`,
          `Datum osnivanja: ${companyDetails.establishedDate}`,
          `Pravni status: ${companyDetails.status}`
        ],
        contentEn: [
          `Full Legal Entity Name: ${companyDetails.legalName}`,
          `Short Registered Name: ${companyDetails.shortName}`,
          `Brand Name: ${companyDetails.brandName}`,
          `Sole Proprietor / Owner: ${companyDetails.owner}`,
          `Tax Identification Number (PIB): ${companyDetails.pib}`,
          `Business Registration Number (MB): ${companyDetails.maticniBroj}`,
          `Activity Code: ${companyDetails.activityCode} – Manufacturing of other textile items`,
          `Established Date: ${companyDetails.establishedDate}`,
          `Registration Status: Active registered business entity (APR RS)`
        ]
      },
      {
        title: '2. Sedište radionice i ateljea',
        titleEn: '2. Headquarters & Studio Address',
        content: [
          `Ulica i broj: ${companyDetails.address.street} ${companyDetails.address.number}`,
          `Mesto i poštanski broj: ${companyDetails.address.postalCode} ${companyDetails.address.city}`,
          `Opština: ${companyDetails.address.municipality}`,
          `Država: ${companyDetails.address.country}`,
          `Geografska regija: Homolje (Braničevski okrug)`
        ],
        contentEn: [
          `Street & Number: ${companyDetails.address.street} ${companyDetails.address.number}`,
          `City & Postal Code: ${companyDetails.address.postalCode} ${companyDetails.address.city}`,
          `Municipality: ${companyDetails.address.municipality}`,
          `Country: ${companyDetails.address.country}`,
          `Geographical Region: Homolje Mountains (Braničevo District)`
        ]
      },
      {
        title: '3. Službeni kontakti i radno vreme',
        titleEn: '3. Official Contact & Hours',
        content: [
          `Kontakt telefon: ${companyDetails.phoneFormatted}`,
          `Službeni E-mail: ${companyDetails.email}`,
          `Internet adresa: https://savremenikoreni.com`,
          `Radno vreme ateljea: ${companyDetails.workingHours}`,
          `Radionica je sertifikovani proizvođač autentičnih srpskih rukotvorina.`
        ],
        contentEn: [
          `Direct Phone: ${companyDetails.phoneFormatted}`,
          `Official Email: ${companyDetails.email}`,
          `Website URL: https://savremenikoreni.com`,
          `Atelier Operating Hours: ${companyDetails.workingHours}`,
          `Certified artisan producer of Serbian folk heritage craft items.`
        ]
      }
    ]
  }
};
