/* ERLY Learning Studio — content shared by more than one view (an experience and a chapter's signature interaction).
   Moved here unchanged from ls-exp2.js (cell parts, the history of the circulation) and ls-x-earth.js (Earth's layers)
   so that the experiences and the chapter pages show exactly the same verified facts. */
(function () {
  'use strict';
  const LS = window.LS = window.LS || {}; const C = LS.content = LS.content || {};
  C.cellParts = {
    wall: ['Cell wall', 'Made mainly of **cellulose**. Strengthens the cell and keeps its shape. Plants, fungi and many bacteria have one; animal cells do not.', true],
    membrane: ['Cell membrane', 'A thin layer that **controls what enters and leaves** the cell. Every cell has one.', false],
    nucleus: ['Nucleus', 'Contains the **DNA**, which carries the instructions for making the cell’s proteins.', false],
    vacuole: ['Permanent vacuole', 'Filled with **cell sap**. Pressing outwards on the wall, it keeps the cell firm (turgid). Animal cells may have small, temporary vacuoles but not this large permanent one.', true],
    chloro: ['Chloroplast', 'Contains **chlorophyll**, which absorbs light for **photosynthesis**. About 5 µm long. Not found in animal cells.', true],
    mito: ['Mitochondrion', 'Where **aerobic respiration** releases energy from glucose. Both plant and animal cells have them.', false],
    ribo: ['Ribosomes', 'Tiny structures that **make proteins**. Found free in the cytoplasm and on membranes.', false],
    cyto: ['Cytoplasm', 'A jelly-like fluid where many of the cell’s **chemical reactions** take place.', false]
  };;
  C.bloodHistory = [
    [180, 'c. 2nd century CE', 'Galen', 'Taught that blood is made in the liver and used up by the body, and that some passes from the right to the left side of the heart through tiny pores in the wall between them (the septum).', 'His own surviving medical writings, copied for centuries.', 'documented', 'His texts survive; the pores he described do not exist.'],
    [1242, 'c. 1242', 'Ibn al-Nafis (Damascus and Cairo)', 'Wrote that the septum is solid with no pores, so blood must travel from the right side of the heart to the left **through the lungs** — the pulmonary circulation.', 'His commentary on the anatomy in Ibn Sina’s *Canon of Medicine* (manuscript).', 'approx', 'The manuscript is dated by scholars; the exact year is approximate. It was not widely known in Europe until it was studied again in 1924.'],
    [1543, '1543', 'Andreas Vesalius', 'Published *De humani corporis fabrica*, a detailed anatomy based on human dissection; in the 1555 edition he openly doubted that blood passes through the septum.', 'The printed book and its woodcut illustrations.', 'documented', 'Printed and dated.'],
    [1553, '1553', 'Michael Servetus', 'Described blood passing through the lungs, in a book on religion, *Christianismi Restitutio*.', 'Three copies of the book survive; most were burned.', 'documented', 'Dated printing; very few people could have read it.'],
    [1628, '1628', 'William Harvey', 'Showed that blood **circulates** — pumped out by the heart and returned by the veins — using experiments and a calculation: the heart pumps far more blood in an hour than the body could make.', '*De Motu Cordis* (printed book).', 'documented', 'Printed and dated; his experiments can be repeated.'],
    [1661, '1661', 'Marcello Malpighi', 'Saw **capillaries** in a frog’s lung through a microscope — the missing link between arteries and veins that Harvey could not see.', 'His published letters *De pulmonibus*.', 'documented', 'Printed and dated.'],
    [1733, '1733', 'Stephen Hales', 'Made the first recorded measurement of **blood pressure**, in a horse, with a glass tube connected to an artery.', 'His book *Haemastaticks*.', 'documented', 'Printed and dated.'],
    [1816, '1816', 'René Laennec', 'Invented the **stethoscope**, letting doctors listen to the heart and lungs.', 'His 1819 treatise on listening to the chest.', 'documented', 'Well recorded.'],
    [1903, '1903', 'Willem Einthoven', 'Recorded the heart’s electrical activity with a string galvanometer — the **electrocardiogram (ECG)**.', 'His published recordings; Nobel Prize 1924.', 'documented', 'Well recorded.'],
    [1967, '1967', 'Christiaan Barnard and team', 'Performed the first human-to-human **heart transplant**, in Cape Town.', 'Hospital records and worldwide news reports, 3 December 1967.', 'documented', 'Well recorded.']
  ];;
  C.earthLayers = [[0, 35, 'Crust', 'solid rock', 'ranges from about 15 °C at the surface to ~400–1000 °C at its base', '#9b7b55'], [35, 660, 'Upper mantle', 'solid rock that flows very slowly', '~1000–1900 °C', '#c96a3a'], [660, 2890, 'Lower mantle', 'solid rock under enormous pressure', '~1900–3700 °C', '#d9553a'], [2890, 5150, 'Outer core', 'liquid iron and nickel — its flow makes Earth’s magnetic field', '~4000–5000 °C', '#f0a030'], [5150, 6371, 'Inner core', 'solid iron and nickel (pressure keeps it solid)', '~5000–5400 °C', '#fde07a']];
})();
