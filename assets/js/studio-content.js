/* ERLY Reading Studio — the course-reading library.
   Each reading has pages of paragraphs ([term] marks a glossary word), the
   course team's prepared help for each paragraph (plain-words summary and a
   quick check), an optional diagram with step-by-step notes, and a bilingual
   glossary. Students can also open their own PDF in the studio; those are
   read on this device and never leave it.
   In the demo these readings are written in advance so nothing is invented
   at runtime. */
(function () {
  'use strict';
  const ARROWS = `<defs><marker id="ah2" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto"><path d="M0 0l14 7-14 7z" fill="var(--accent)"/></marker><marker id="ah3" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto"><path d="M0 0l14 7-14 7z" fill="var(--teal)"/></marker></defs>`;

  const LIB = [
    {
      id: 'mech210', title: 'MECH210_Week4_Reading.pdf', course: 'MECH 210 · Thermodynamics I', short: 'Thermodynamics', unit: ['Week 4 reading', 'قراءة الأسبوع ٤'],
      field: 'engineering', hue: 18, startPage: 12, name: ['Energy that moves with matter', 'الطاقة التي تنتقل مع المادة'],
      pages: [
        {
          h: '4.1  Energy that moves with matter',
          paras: [
            {
              text: 'When a fluid flows through a turbine, it carries energy across the [boundary] of the system. Engineers call the region they study a [control volume], and they track everything that crosses its boundary: heat, work, and the energy carried by the moving fluid itself.',
              sum: ['A control volume is simply the region engineers choose to study.', 'Energy crosses its edge in three ways: heat, work, and energy carried by flowing fluid.', 'A turbine is a good example — fluid flows in, fluid flows out.'],
              check: { q: 'Which of these can carry energy across a control-volume boundary?', opts: ['Only heat', 'Heat, work and the flowing fluid', 'Only the fluid’s speed'], a: 1, why: 'All three count: heat, work, and the energy the fluid brings with it.' }
            },
            {
              text: 'In [steady flow], the mass entering each second equals the mass leaving, so nothing builds up inside. This single assumption, called [conservation of mass], turns a difficult time-dependent problem into simple algebra that fits on one page.',
              sum: ['Steady flow means whatever goes in each second also comes out.', 'So nothing piles up inside the control volume.', 'That one idea makes the maths much simpler.'],
              check: { q: 'In steady flow, 3 kg/s enters a turbine. How much leaves?', opts: ['Less than 3 kg/s', 'Exactly 3 kg/s', 'More than 3 kg/s'], a: 1, why: 'Nothing builds up inside, so mass in equals mass out.' }
            }
          ]
        },
        {
          h: '4.2  Enthalpy: two energies in one',
          paras: [
            {
              text: 'The energy carried by a moving fluid includes its [internal energy] and the [flow work] needed to push it into the control volume against the pressure already inside. Because these two always appear together, engineers combine them into one property called [enthalpy], written h.',
              sum: ['Moving fluid carries two kinds of energy: internal energy and “push-in” energy (flow work).', 'They always come together, so engineers add them into one number.', 'That number is called enthalpy, h.'],
              check: { q: 'Enthalpy combines which two things?', opts: ['Speed and height', 'Internal energy and flow work', 'Heat and mass'], a: 1, why: 'h = internal energy + flow work, packed into one property.' }
            },
            {
              text: 'Tables list enthalpy for water, refrigerants and air at different temperatures and pressures. This is why most first-year problems begin with looking a value up rather than calculating it: find the [state], read h, then apply the [energy balance].',
              sum: ['Enthalpy values are already in tables.', 'You look them up using temperature and pressure.', 'Recipe: find the state → read h → do the energy balance.'],
              check: { q: 'What is usually the first step in a turbine problem?', opts: ['Guess the work output', 'Look up h using temperature and pressure', 'Measure the turbine'], a: 1, why: 'Find the state, read h from the table, then balance the energy.' }
            }
          ]
        },
        {
          h: '4.3  Turbines and nozzles',
          paras: [
            {
              text: 'In a well-[insulated] turbine, heat transfer is close to zero and changes in height are negligible. The work produced is then almost exactly the drop in enthalpy between inlet and outlet, multiplied by the [mass flow rate].',
              sum: ['An insulated turbine lets almost no heat in or out.', 'Work out = (h in − h out) × mass flow rate.', 'A bigger enthalpy drop means more work.'],
              check: { q: 'h in − h out = 500 kJ/kg and the mass flow is 2 kg/s. What is the work output?', opts: ['250 kW', '1000 kW', '502 kW'], a: 1, why: '500 kJ/kg × 2 kg/s = 1000 kJ/s, which is 1000 kW.' }
            },
            {
              text: 'A [nozzle] does the opposite job. It produces no work; instead it converts a drop in enthalpy into a large increase in [velocity]. The most common mistake is not the algebra but the bookkeeping: draw the control volume first and list every arrow that crosses it.',
              sum: ['A nozzle makes no work — it turns enthalpy into speed.', 'Most mistakes are bookkeeping, not maths.', 'Always draw the box and every arrow first.'],
              check: { q: 'What does a nozzle turn an enthalpy drop into?', opts: ['Shaft work', 'Higher speed', 'Heat'], a: 1, why: 'No shaft, no work — the energy goes into velocity.' }
            }
          ]
        }
      ],
      fig: {
        page: 0,
        cap: 'Figure 4.3 — A control volume around a steam turbine. Mass and energy cross the dashed boundary.',
        svg: `<svg viewBox="0 0 420 160" aria-hidden="true">
          <g data-fs="0"><rect x="120" y="16" width="180" height="118" rx="12" fill="none" stroke="currentColor" stroke-dasharray="6 6" stroke-width="2" opacity=".6"/></g>
          <path d="M170 52h80l18 44H152z" fill="currentColor" opacity=".12"/>
          <g data-fs="1"><path d="M20 60h104" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="22" y="48" font-size="13" fill="currentColor">m, h in</text></g>
          <g data-fs="2"><path d="M210 96v40" stroke="var(--teal)" stroke-width="4" marker-end="url(#ah3)"/><text x="222" y="152" font-size="13" fill="currentColor">W out</text></g>
          <g data-fs="3"><path d="M282 84h104" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="330" y="72" font-size="13" fill="currentColor">m, h out</text></g>
          ${ARROWS}</svg>`,
        steps: ['The dashed box is the control volume — the part we are studying.', 'Fluid enters on the left, carrying its mass and enthalpy (m, h in).', 'Work W leaves through the turbine shaft.', 'Fluid leaves on the right with less enthalpy (m, h out). The drop became work.']
      },
      terms: {
        'boundary': ['The edge of the region you are studying. Anything crossing it gets counted.', 'الحدود'],
        'control volume': ['An imaginary box drawn around the part of the machine you are studying.', 'حجم التحكم'],
        'steady flow': ['Flow whose conditions do not change over time.', 'التدفق المستقر'],
        'conservation of mass': ['Mass is never created or destroyed — it only moves.', 'حفظ الكتلة'],
        'internal energy': ['Energy stored in the fluid’s molecules; it rises with temperature.', 'الطاقة الداخلية'],
        'flow work': ['The energy needed to push fluid into the box against the pressure inside.', 'شغل التدفق'],
        'enthalpy': ['Internal energy + flow work, combined into one property, h.', 'الإنثالبي'],
        'state': ['The condition of the fluid, fixed by values like temperature and pressure.', 'الحالة'],
        'energy balance': ['Energy in − energy out = change inside. In steady flow, the change is zero.', 'موازنة الطاقة'],
        'insulated': ['Wrapped so heat can’t get in or out.', 'معزول'],
        'mass flow rate': ['How many kilograms of fluid pass each second (kg/s).', 'معدل تدفق الكتلة'],
        'nozzle': ['A narrowing pipe that speeds fluid up.', 'الفوهة'],
        'velocity': ['Speed in a particular direction.', 'السرعة']
      }
    },

    {
      id: 'psyc101', title: 'PSYC101_Memory_Chapter6.pdf', course: 'PSYC 101 · Introduction to Psychology', short: 'Psychology', unit: ['Chapter 6', 'الفصل ٦'],
      field: 'science', hue: 268, startPage: 141, name: ['How we learn and forget', 'كيف نتعلم وننسى'],
      pages: [
        {
          h: '6.1  From attention to memory',
          paras: [
            {
              text: 'Everything you learn begins with [attention]. Of the thousands of sights and sounds reaching you in a lecture hall, only the few you attend to are passed on to [working memory], a small mental workspace that holds information while you use it. Psychologists estimate that it can juggle only about four meaningful chunks at once.',
              sum: ['Learning starts with what you pay attention to.', 'Working memory is a small workspace that holds what you are using right now.', 'It can hold only around four chunks at a time.'],
              check: { q: 'Roughly how many meaningful chunks can working memory juggle at once?', opts: ['About four', 'About forty', 'There is no limit'], a: 0, why: 'Working memory is small — around four meaningful chunks.' }
            },
            {
              text: 'Because the workspace is so small, a dense slide or a long spoken sentence can overload it. This overload is called [cognitive load]. Breaking material into meaningful groups, known as [chunking], frees up space: a phone number is easier to hold as three groups than as ten separate digits.',
              sum: ['Too much at once overloads working memory — that is cognitive load.', 'Grouping information into chunks frees up space.', 'Example: a phone number in three groups instead of ten digits.'],
              check: { q: 'Why does chunking help?', opts: ['It makes the material longer', 'It groups items so they take less working-memory space', 'It removes the need for attention'], a: 1, why: 'Grouped items count as fewer chunks, so the small workspace can hold more.' }
            }
          ]
        },
        {
          h: '6.2  Making memories last',
          paras: [
            {
              text: 'Moving information into [long-term memory] depends on [encoding]: how deeply you process it. Thinking about what an idea means, linking it to something you already know, or explaining it in your own words creates stronger memories than simply reading it again.',
              sum: ['Long-term memory depends on how deeply you process information (encoding).', 'Linking ideas to what you know and explaining them in your own words works best.', 'Re-reading alone creates weak memories.'],
              check: { q: 'Which creates the strongest memory?', opts: ['Reading the page again', 'Explaining the idea in your own words', 'Highlighting every line'], a: 1, why: 'Explaining means you process the meaning deeply — that is strong encoding.' }
            },
            {
              text: 'Without review, memories fade quickly; Hermann Ebbinghaus plotted this as the [forgetting curve]. Each time you successfully recall something, the curve becomes flatter. Spreading short reviews over days, the [spacing effect], beats one long session the night before an exam.',
              sum: ['Memories fade fast without review — the forgetting curve.', 'Every successful recall makes forgetting slower.', 'Short reviews spread over days beat one long cram session.'],
              check: { q: 'What does the spacing effect suggest?', opts: ['Cram the night before', 'Spread short reviews over several days', 'Review only once'], a: 1, why: 'Spaced reviews flatten the forgetting curve far better than cramming.' }
            }
          ]
        },
        {
          h: '6.3  Study strategies that work',
          paras: [
            {
              text: '[Retrieval practice] means testing yourself: closing the book and recalling what you remember, using flashcards, or answering past questions. It feels harder than re-reading, but that effort is exactly what strengthens memory. Mixing different types of problems, called [interleaving], also helps you learn when to use each method.',
              sum: ['Testing yourself (retrieval practice) strengthens memory more than re-reading.', 'The extra effort is what makes it work.', 'Mixing problem types (interleaving) teaches you when to use each method.'],
              check: { q: 'Why does retrieval practice work so well?', opts: ['It is easier than re-reading', 'The effort of recalling strengthens memory', 'It avoids mistakes'], a: 1, why: 'Effortful recall is what makes the memory stronger.' }
            },
            {
              text: 'Finally, good learners use [metacognition]: they notice how well they actually understand something and adjust. A quick self-test before moving on tells you far more than the comfortable feeling that a page “looks familiar”.',
              sum: ['Metacognition is noticing how well you really understand.', 'A quick self-test is more honest than a feeling of familiarity.', 'Adjust your studying based on what the test shows.'],
              check: { q: 'What is a reliable way to check your understanding?', opts: ['The page looks familiar', 'A quick self-test', 'Reading faster'], a: 1, why: 'Familiarity can fool you; a self-test shows what you can actually recall.' }
            }
          ]
        }
      ],
      fig: {
        page: 0,
        cap: 'Figure 6.1 — A simple model of memory: attention filters input, working memory processes it, encoding stores it, retrieval brings it back.',
        svg: `<svg viewBox="0 0 420 170" aria-hidden="true">
          <g data-fs="0"><rect x="8" y="50" width="104" height="60" rx="12" fill="currentColor" opacity=".08"/><text x="60" y="76" text-anchor="middle" font-size="13" fill="currentColor">Senses</text><text x="60" y="94" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">sights, sounds</text></g>
          <g data-fs="1"><path d="M114 80h36" stroke="var(--accent)" stroke-width="4" marker-end="url(#ah2)"/><text x="132" y="68" text-anchor="middle" font-size="11" fill="currentColor">attention</text></g>
          <g data-fs="2"><rect x="158" y="44" width="110" height="72" rx="12" fill="none" stroke="var(--accent)" stroke-width="2.4"/><text x="213" y="76" text-anchor="middle" font-size="13" fill="currentColor">Working</text><text x="213" y="93" text-anchor="middle" font-size="13" fill="currentColor">memory (~4)</text></g>
          <g data-fs="3"><path d="M270 66h44" stroke="var(--teal)" stroke-width="4" marker-end="url(#ah3)"/><text x="292" y="56" text-anchor="middle" font-size="11" fill="currentColor">encoding</text><rect x="320" y="36" width="94" height="88" rx="12" fill="var(--teal)" opacity=".14"/><text x="367" y="78" text-anchor="middle" font-size="13" fill="currentColor">Long-term</text><text x="367" y="95" text-anchor="middle" font-size="13" fill="currentColor">memory</text><path d="M318 104h-44" stroke="var(--teal)" stroke-width="3" stroke-dasharray="5 4" marker-end="url(#ah3)"/><text x="296" y="128" text-anchor="middle" font-size="11" fill="currentColor">retrieval</text></g>
          ${ARROWS}</svg>`,
        steps: ['Your senses take in far more than you can use — sights, sounds, everything in the room.', 'Attention filters it: only what you focus on moves on.', 'Working memory holds and uses about four chunks at a time — it overloads easily.', 'Encoding stores it in long-term memory, and retrieval brings it back. Each successful retrieval makes the memory stronger.']
      },
      terms: {
        'attention': ['Focusing on some information and ignoring the rest.', 'الانتباه'],
        'working memory': ['The small mental workspace that holds what you are using right now.', 'الذاكرة العاملة'],
        'cognitive load': ['How much effort working memory is handling at once.', 'العبء المعرفي'],
        'chunking': ['Grouping items into meaningful units so they are easier to hold.', 'التجزئة'],
        'long-term memory': ['The lasting store of knowledge and experiences.', 'الذاكرة طويلة المدى'],
        'encoding': ['Turning information into a memory; deeper thinking means stronger encoding.', 'الترميز'],
        'forgetting curve': ['How quickly memories fade without review.', 'منحنى النسيان'],
        'spacing effect': ['Spreading study over time leads to longer-lasting learning.', 'تأثير التباعد'],
        'retrieval practice': ['Learning by recalling information from memory, e.g. self-testing.', 'ممارسة الاسترجاع'],
        'interleaving': ['Mixing different types of problems in one study session.', 'التداخل في المذاكرة'],
        'metacognition': ['Thinking about your own thinking and understanding.', 'ما وراء المعرفة']
      }
    },

    {
      id: 'csci110', title: 'CSCI110_Lecture3_Algorithms.pdf', course: 'CSCI 110 · Introduction to Programming', short: 'Computing', unit: ['Lecture 3 notes', 'ملاحظات المحاضرة ٣'],
      field: 'computing', hue: 205, startPage: 31, name: ['Algorithms, loops and searching', 'الخوارزميات والحلقات والبحث'],
      pages: [
        {
          h: '3.1  What is an algorithm?',
          paras: [
            {
              text: 'An [algorithm] is a precise, step-by-step recipe for solving a problem. Before writing any code, programmers often sketch it in [pseudocode]: plain-language steps such as “for each student, add their mark to the total”. Pseudocode lets you check the logic without worrying about syntax.',
              sum: ['An algorithm is a precise step-by-step recipe.', 'Pseudocode writes those steps in plain language first.', 'It lets you check the logic before worrying about code syntax.'],
              check: { q: 'What is pseudocode for?', opts: ['Running programs faster', 'Planning the logic in plain language', 'Hiding the code'], a: 1, why: 'Pseudocode is a plain-language plan you can check before coding.' }
            },
            {
              text: 'Most algorithms combine three building blocks: sequence (do steps in order), selection (make a choice with a [condition], such as “if the mark is at least 50”), and repetition. Repetition is handled by a [loop], which runs the same steps again and again; each pass through it is called an [iteration].',
              sum: ['Three building blocks: sequence, selection and repetition.', 'Selection uses a condition, like “if mark ≥ 50”.', 'Repetition uses a loop; each pass is an iteration.'],
              check: { q: 'What is one pass through a loop called?', opts: ['A condition', 'An iteration', 'A variable'], a: 1, why: 'Each run through the loop body is one iteration.' }
            }
          ]
        },
        {
          h: '3.2  Loops in practice',
          paras: [
            {
              text: 'A [variable] is a named box that stores a value, such as total = 0. A typical loop updates a variable on every iteration: “for each mark in the list, total = total + mark”. When the loop ends, total holds the sum. A loop must always have a way to stop; otherwise it becomes an [infinite loop] and the program never finishes.',
              sum: ['A variable is a named box that holds a value.', 'Loops usually update a variable each time round, like adding marks to a total.', 'Every loop needs a stopping point, or it runs forever (an infinite loop).'],
              check: { q: 'What happens if a loop never meets its stopping condition?', opts: ['It runs forever — an infinite loop', 'It skips to the end', 'It deletes the variable'], a: 0, why: 'Without a way to stop, the loop repeats forever.' }
            },
            {
              text: 'Errors in logic are called bugs, and finding them is [debugging]. A powerful habit is to trace the loop by hand: write down the value of each variable after every iteration for a small example. Most bugs appear within the first two or three passes.',
              sum: ['Finding and fixing logic errors is called debugging.', 'Trace a loop by hand: write each variable’s value after every pass.', 'Most bugs show up in the first few iterations.'],
              check: { q: 'What is a good way to find a bug in a loop?', opts: ['Trace each variable by hand for a small example', 'Make the loop longer', 'Delete the loop'], a: 0, why: 'Tracing shows exactly where the values stop matching what you expect.' }
            }
          ]
        },
        {
          h: '3.3  Searching smarter',
          paras: [
            {
              text: '[Linear search] checks items one by one until it finds the target. It works on any list, but for a list of one million names it may need one million checks. [Binary search] is much faster on a sorted list: it checks the middle item, discards the half that cannot contain the target, and repeats.',
              sum: ['Linear search checks every item in turn — simple but slow for big lists.', 'Binary search needs a sorted list.', 'It checks the middle and throws away half the list each time.'],
              check: { q: 'What does binary search need?', opts: ['A sorted list', 'A list of numbers only', 'An infinite loop'], a: 0, why: 'Halving only works if the list is in order.' }
            },
            {
              text: 'Because it halves the list each time, binary search needs only about twenty checks for a million items. Computer scientists describe this growth with [time complexity]: linear search grows in step with the list, while binary search grows only logarithmically.',
              sum: ['Halving means about 20 checks for a million items.', 'Time complexity describes how the work grows as the input grows.', 'Linear search grows with the list; binary search grows very slowly (logarithmically).'],
              check: { q: 'About how many checks does binary search need for one million sorted items?', opts: ['About 20', 'About 500,000', 'About 1,000,000'], a: 0, why: '2²⁰ is about a million, so about 20 halvings are enough.' }
            }
          ]
        }
      ],
      fig: {
        page: 1,
        cap: 'Figure 3.2 — Flowchart of a loop that adds up a list of marks.',
        svg: `<svg viewBox="0 0 420 190" aria-hidden="true">
          <g data-fs="0"><rect x="20" y="70" width="96" height="44" rx="22" fill="currentColor" opacity=".1"/><text x="68" y="97" text-anchor="middle" font-size="13" fill="currentColor">total = 0</text></g>
          <g data-fs="1"><path d="M118 92h30" stroke="var(--accent)" stroke-width="3" marker-end="url(#ah2)"/><path d="M210 52l58 40-58 40-58-40z" fill="none" stroke="var(--accent)" stroke-width="2.4"/><text x="210" y="88" text-anchor="middle" font-size="12" fill="currentColor">more</text><text x="210" y="103" text-anchor="middle" font-size="12" fill="currentColor">marks?</text></g>
          <g data-fs="2"><path d="M210 132v20" stroke="var(--teal)" stroke-width="3" marker-end="url(#ah3)"/><rect x="150" y="156" width="120" height="30" rx="8" fill="var(--teal)" opacity=".16"/><text x="210" y="176" text-anchor="middle" font-size="12" fill="currentColor">total += mark</text><path d="M150 171h-40v-79h38" fill="none" stroke="var(--teal)" stroke-width="2.4" stroke-dasharray="5 4"/><text x="96" y="150" font-size="11" fill="currentColor">yes · iterate</text></g>
          <g data-fs="3"><path d="M270 92h50" stroke="var(--accent)" stroke-width="3" marker-end="url(#ah2)"/><text x="290" y="82" font-size="11" fill="currentColor">no</text><rect x="326" y="70" width="84" height="44" rx="22" fill="currentColor" opacity=".1"/><text x="368" y="97" text-anchor="middle" font-size="12" fill="currentColor">print total</text></g>
          ${ARROWS}</svg>`,
        steps: ['Start by creating the variable total and setting it to zero.', 'The diamond is the loop’s condition: are there more marks to add?', 'If yes, add the next mark to total, then go back and check again — that is one iteration.', 'If no, the loop stops and the program prints the total.']
      },
      terms: {
        'algorithm': ['A precise, step-by-step method for solving a problem.', 'خوارزمية'],
        'pseudocode': ['Plain-language steps that describe an algorithm before coding.', 'الشيفرة الزائفة'],
        'condition': ['A true-or-false test that decides what happens next.', 'شرط'],
        'loop': ['Code that repeats a set of steps.', 'حلقة تكرار'],
        'iteration': ['One pass through a loop.', 'تكرار'],
        'variable': ['A named place that stores a value which can change.', 'متغيّر'],
        'infinite loop': ['A loop that never stops because its exit condition is never met.', 'حلقة لا نهائية'],
        'debugging': ['Finding and fixing errors in a program.', 'تصحيح الأخطاء'],
        'linear search': ['Checking items one by one until you find the target.', 'البحث الخطي'],
        'binary search': ['Searching a sorted list by repeatedly halving it.', 'البحث الثنائي'],
        'time complexity': ['How the running time grows as the input gets bigger.', 'التعقيد الزمني']
      }
    },

    {
      id: 'biol101', title: 'BIOL101_CellMembrane_Unit2.pdf', course: 'BIOL 101 · Cell Biology', short: 'Biology', unit: ['Unit 2 reading', 'قراءة الوحدة ٢'],
      field: 'science', hue: 150, startPage: 58, name: ['The cell membrane and transport', 'غشاء الخلية والنقل'],
      pages: [
        {
          h: '2.1  A flexible, living border',
          paras: [
            {
              text: 'Every cell is wrapped in a thin membrane built mainly from a [phospholipid bilayer]: two layers of molecules whose water-loving heads face outward and whose water-fearing tails hide in the middle. This arrangement forms itself naturally in water and makes the membrane flexible.',
              sum: ['The cell membrane is mostly a phospholipid bilayer — two layers of molecules.', 'Water-loving heads face out; water-fearing tails hide inside.', 'This forms naturally in water and keeps the membrane flexible.'],
              check: { q: 'Where are the water-fearing tails of the phospholipids?', opts: ['Facing the outside water', 'Hidden in the middle of the bilayer', 'Inside the nucleus'], a: 1, why: 'The tails avoid water by hiding between the two layers of heads.' }
            },
            {
              text: 'The membrane is [selectively permeable]: small, uncharged molecules such as oxygen slip through easily, while ions and large molecules need help. [Protein channels] embedded in the bilayer act like guarded doors for particular substances.',
              sum: ['The membrane lets some things through and blocks others — it is selectively permeable.', 'Small, uncharged molecules like oxygen pass easily.', 'Protein channels are doors for ions and larger molecules.'],
              check: { q: 'What does “selectively permeable” mean?', opts: ['Nothing can pass', 'Everything can pass', 'Some substances pass and others don’t'], a: 2, why: 'The membrane chooses: small uncharged molecules pass, others need channels.' }
            }
          ]
        },
        {
          h: '2.2  Moving without energy',
          paras: [
            {
              text: 'Particles naturally spread from where they are crowded to where they are scarce. This movement down a [concentration gradient] is called [diffusion], and it needs no energy from the cell, which is why it is described as passive transport.',
              sum: ['Particles spread from crowded areas to less crowded ones.', 'That spreading down a concentration gradient is diffusion.', 'It costs the cell no energy — passive transport.'],
              check: { q: 'Which way do particles move in diffusion?', opts: ['From low to high concentration', 'From high to low concentration', 'They don’t move'], a: 1, why: 'They spread from crowded (high) to less crowded (low) areas.' }
            },
            {
              text: '[Osmosis] is the diffusion of water across a membrane. If a red blood cell is placed in pure water, water rushes in and the cell can burst; in very salty water, water leaves and the cell shrivels. Keeping this balance steady is part of [homeostasis].',
              sum: ['Osmosis is water diffusing across a membrane.', 'In pure water a blood cell swells; in salty water it shrivels.', 'Keeping that balance steady is part of homeostasis.'],
              check: { q: 'What happens to a red blood cell in very salty water?', opts: ['It swells', 'It shrivels', 'Nothing'], a: 1, why: 'Water moves out towards the salty side, so the cell shrinks.' }
            }
          ]
        },
        {
          h: '2.3  Paying to move: active transport',
          paras: [
            {
              text: 'Sometimes a cell must move substances against their gradient, from scarce to crowded. This [active transport] uses carrier proteins that act like pumps, and it costs energy in the form of [ATP], the cell’s energy currency.',
              sum: ['Active transport moves substances from low to high concentration — uphill.', 'Pump-like carrier proteins do the work.', 'It costs energy, paid in ATP.'],
              check: { q: 'What does active transport need that diffusion doesn’t?', opts: ['Water', 'Energy (ATP)', 'A nucleus'], a: 1, why: 'Moving against the gradient costs energy, supplied by ATP.' }
            },
            {
              text: 'The sodium–potassium pump is a classic example: in each cycle it pushes three sodium ions out and brings two potassium ions in. Nerve cells rely on this imbalance to send electrical signals, so a large share of the brain’s energy goes into running these pumps.',
              sum: ['The sodium–potassium pump moves 3 sodium out and 2 potassium in each cycle.', 'Nerve cells use this imbalance to send signals.', 'Running these pumps uses a lot of the brain’s energy.'],
              check: { q: 'In each cycle, the sodium–potassium pump moves…', opts: ['3 sodium out, 2 potassium in', '2 sodium in, 3 potassium out', '1 of each'], a: 0, why: 'Three sodium ions out, two potassium ions in.' }
            }
          ]
        }
      ],
      fig: {
        page: 0,
        cap: 'Figure 2.1 — The phospholipid bilayer with a protein channel. Oxygen passes straight through; ions use the channel.',
        svg: `<svg viewBox="0 0 420 160" aria-hidden="true">
          <g data-fs="0">${Array.from({ length: 13 }, (_, i) => { const x = 18 + i * 30; return x > 180 && x < 240 ? '' : `<circle cx="${x}" cy="52" r="8" fill="var(--teal)" opacity=".7"/><path d="M${x - 3} 60v22M${x + 3} 60v22" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M${x - 3} 88v22M${x + 3} 88v22" stroke="currentColor" stroke-width="2" opacity=".45"/><circle cx="${x}" cy="118" r="8" fill="var(--teal)" opacity=".7"/>`; }).join('')}</g>
          <g data-fs="1"><text x="10" y="24" font-size="12" fill="currentColor">water-loving heads</text><text x="10" y="148" font-size="12" fill="currentColor">water-fearing tails inside</text></g>
          <g data-fs="2"><rect x="186" y="38" width="48" height="94" rx="16" fill="var(--accent)" opacity=".22"/><path d="M210 18v120" stroke="var(--accent)" stroke-width="3" stroke-dasharray="5 4" marker-end="url(#ah2)"/><text x="244" y="24" font-size="12" fill="currentColor">ion through a channel</text></g>
          <g data-fs="3"><circle cx="330" cy="20" r="6" fill="var(--accent)"/><path d="M330 30v100" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#ah2)"/><text x="342" y="150" font-size="12" fill="currentColor">O₂ diffuses</text></g>
          ${ARROWS}</svg>`,
        steps: ['The membrane is two rows of phospholipids — heads on the outside, tails tucked in the middle.', 'Heads love water, so they face the watery inside and outside of the cell; the tails avoid it.', 'Ions can’t cross the oily middle, so they use protein channels like doors.', 'Small uncharged molecules like oxygen simply diffuse straight across.']
      },
      terms: {
        'phospholipid bilayer': ['A double layer of phospholipid molecules that forms the cell membrane.', 'الطبقة الفوسفوليبيدية المزدوجة'],
        'selectively permeable': ['Letting some substances through but not others.', 'نفاذية انتقائية'],
        'protein channels': ['Proteins that form passages for specific substances.', 'القنوات البروتينية'],
        'concentration gradient': ['A difference in how crowded particles are between two areas.', 'تدرج التركيز'],
        'diffusion': ['Particles spreading from high to low concentration, without energy.', 'الانتشار'],
        'osmosis': ['Diffusion of water across a membrane.', 'الخاصية الأسموزية'],
        'homeostasis': ['Keeping the body’s internal conditions stable.', 'الاتزان الداخلي'],
        'active transport': ['Moving substances against their gradient, using energy.', 'النقل النشط'],
        'ATP': ['The molecule cells use to store and spend energy.', 'أدينوسين ثلاثي الفوسفات']
      }
    },

    {
      id: 'busn210', title: 'BUSN210_MarketingMix_UAE.pdf', course: 'BUSN 210 · Principles of Marketing', short: 'Business', unit: ['Case reading', 'قراءة الحالة'],
      field: 'business', hue: 330, startPage: 77, name: ['The marketing mix in the UAE', 'المزيج التسويقي في الإمارات'],
      pages: [
        {
          h: '5.1  Knowing your customer',
          paras: [
            {
              text: 'Marketing begins with people, not products. Firms divide a broad market into groups with similar needs, a process called [segmentation]. A café chain in Dubai might separate busy commuters, university students and families on weekend outings, because each group values different things.',
              sum: ['Marketing starts with understanding people.', 'Segmentation splits a market into groups with similar needs.', 'Example: commuters, students and families want different things from a café.'],
              check: { q: 'What is segmentation?', opts: ['Lowering prices', 'Dividing a market into groups with similar needs', 'Opening more branches'], a: 1, why: 'Segmentation groups customers by shared needs so you can serve each well.' }
            },
            {
              text: 'After choosing a [target market], the firm decides on its [positioning]: the clear place it wants to hold in customers’ minds compared with competitors. A strong [value proposition] says in one sentence why this customer should choose this brand.',
              sum: ['The target market is the group the firm chooses to serve.', 'Positioning is the place the brand wants in customers’ minds.', 'The value proposition says in one sentence why customers should choose it.'],
              check: { q: 'What does a value proposition do?', opts: ['Lists every product', 'Explains in one sentence why a customer should choose the brand', 'Sets the price'], a: 1, why: 'It is the one-line reason to choose you over competitors.' }
            }
          ]
        },
        {
          h: '5.2  The four Ps',
          paras: [
            {
              text: 'The [marketing mix] is often summarised as the four Ps: product, price, place and promotion. In the UAE’s multicultural market, product decisions might include bilingual Arabic–English packaging, while [pricing strategy] must reflect both premium shoppers and price-sensitive customers.',
              sum: ['The marketing mix = product, price, place and promotion.', 'In the UAE, products may need Arabic–English packaging.', 'Pricing must suit both premium and price-sensitive shoppers.'],
              check: { q: 'Which list shows the four Ps?', opts: ['Product, price, place, promotion', 'People, profit, planet, process', 'Price, plan, push, pull'], a: 0, why: 'The classic marketing mix is product, price, place and promotion.' }
            },
            {
              text: 'Place covers the [distribution channel]: how the product reaches the customer. Malls remain important in the UAE, but [e-commerce] and delivery apps now let even small brands reach customers across all seven emirates.',
              sum: ['Place means the distribution channel — how products reach people.', 'Malls still matter in the UAE.', 'E-commerce and delivery apps help small brands reach every emirate.'],
              check: { q: 'In the four Ps, what does “place” refer to?', opts: ['The shop’s decoration', 'How the product reaches customers', 'Where the company is registered'], a: 1, why: 'Place is about distribution — getting the product to the customer.' }
            }
          ]
        },
        {
          h: '5.3  Promotion and loyalty',
          paras: [
            {
              text: 'Promotion combines advertising, social media, influencers and in-store events. Seasonal moments such as Ramadan, Eid and the Dubai Shopping Festival shape campaign calendars, and messages must respect local culture to build trust.',
              sum: ['Promotion mixes ads, social media, influencers and events.', 'Ramadan, Eid and the Dubai Shopping Festival shape campaign timing.', 'Respecting local culture builds trust.'],
              check: { q: 'Why do seasonal moments matter for promotion in the UAE?', opts: ['They shape when and how campaigns run', 'They ban advertising', 'They set product prices by law'], a: 0, why: 'Campaign calendars are planned around these important periods.' }
            },
            {
              text: 'Ultimately, firms aim for [brand loyalty]: customers who return without needing to be persuaded again. Studying [consumer behaviour] — why people buy, when and how — helps marketers design rewards, service and experiences that keep customers coming back.',
              sum: ['Brand loyalty means customers keep coming back by choice.', 'Consumer behaviour studies why, when and how people buy.', 'That knowledge shapes rewards, service and experiences.'],
              check: { q: 'What is brand loyalty?', opts: ['Customers returning without being persuaded again', 'A discount code', 'A legal contract'], a: 0, why: 'Loyal customers choose the brand again by habit and trust.' }
            }
          ]
        }
      ],
      terms: {
        'segmentation': ['Dividing a market into groups with similar needs.', 'تجزئة السوق'],
        'target market': ['The customer group a business chooses to serve.', 'السوق المستهدف'],
        'positioning': ['The place a brand aims to hold in customers’ minds.', 'تموضع العلامة'],
        'value proposition': ['A short statement of why a customer should choose you.', 'عرض القيمة'],
        'marketing mix': ['Product, price, place and promotion together.', 'المزيج التسويقي'],
        'pricing strategy': ['How a business decides what to charge.', 'استراتيجية التسعير'],
        'distribution channel': ['The route a product takes to reach the customer.', 'قناة التوزيع'],
        'e-commerce': ['Buying and selling online.', 'التجارة الإلكترونية'],
        'brand loyalty': ['Customers repeatedly choosing the same brand.', 'الولاء للعلامة التجارية'],
        'consumer behaviour': ['The study of why, when and how people buy.', 'سلوك المستهلك']
      }
    },

    {
      id: 'envs120', title: 'ENVS120_SolarEnergy_UAE.pdf', course: 'ENVS 120 · Sustainability and Energy', short: 'Sustainability', unit: ['Week 7 reading', 'قراءة الأسبوع ٧'],
      field: 'engineering', hue: 42, startPage: 102, name: ['Solar energy in the UAE', 'الطاقة الشمسية في الإمارات'],
      pages: [
        {
          h: '7.1  Why the sun matters here',
          paras: [
            {
              text: 'The UAE receives some of the strongest sunlight in the world. Scientists measure this as [solar irradiance], the power of sunlight falling on each square metre. High irradiance and wide open land make the country an ideal place for [renewable energy] from the sun.',
              sum: ['The UAE gets some of the strongest sunlight on Earth.', 'Solar irradiance measures the sun’s power on each square metre.', 'Strong sun plus open land is ideal for solar power.'],
              check: { q: 'What does solar irradiance measure?', opts: ['The temperature of the sun', 'The power of sunlight on each square metre', 'How many panels a country owns'], a: 1, why: 'Irradiance is the sunlight power arriving on each square metre.' }
            },
            {
              text: 'Reducing [carbon emissions] is a national priority. The UAE Energy Strategy 2050 aims to raise the share of clean energy in the country’s electricity, and large solar parks such as the Mohammed bin Rashid Al Maktoum Solar Park in Dubai and Noor Abu Dhabi in Sweihan are central to that plan.',
              sum: ['Cutting carbon emissions is a national priority.', 'The UAE Energy Strategy 2050 aims for more clean electricity.', 'Big solar parks in Dubai and Abu Dhabi are central to the plan.'],
              check: { q: 'What is a main goal of the UAE Energy Strategy 2050?', opts: ['More clean energy in electricity', 'Closing all power stations', 'Importing all electricity'], a: 0, why: 'It aims to raise the share of clean energy.' }
            }
          ]
        },
        {
          h: '7.2  Two ways to use sunlight',
          paras: [
            {
              text: '[Photovoltaic] panels turn sunlight directly into electricity using semiconductor cells. Their [efficiency] — the share of sunlight converted to electricity — drops a little as panels get hotter, and desert dust can block light, so regular cleaning, often by robots, matters.',
              sum: ['Photovoltaic (PV) panels turn sunlight straight into electricity.', 'Efficiency falls a little when panels get hot.', 'Dust blocks light, so panels need regular cleaning — often by robots.'],
              check: { q: 'Why do solar panels in the desert need regular cleaning?', opts: ['Dust blocks sunlight', 'Cleaning makes them cooler at night', 'It is required for the warranty only'], a: 0, why: 'Dust reduces the light that reaches the cells.' }
            },
            {
              text: '[Concentrated solar power] works differently: thousands of mirrors focus sunlight onto a receiver to heat a fluid, which then drives a turbine. Because heat can be stored in molten salt, these plants can keep producing electricity after sunset.',
              sum: ['Concentrated solar power uses mirrors to focus sunlight and heat a fluid.', 'The heat drives a turbine to make electricity.', 'Stored heat (in molten salt) keeps it running after sunset.'],
              check: { q: 'How can concentrated solar power keep working after sunset?', opts: ['By storing heat in molten salt', 'By using moonlight', 'It cannot'], a: 0, why: 'Stored heat keeps the turbine running when the sun is down.' }
            }
          ]
        },
        {
          h: '7.3  Keeping the lights on',
          paras: [
            {
              text: 'Solar output rises and falls with the sun, while demand peaks on hot summer evenings when air conditioning runs hardest. Matching the two is the job of the [grid] operator, who balances many sources of electricity minute by minute.',
              sum: ['Solar output follows the sun, but demand peaks on hot evenings.', 'Air conditioning drives much of that evening demand.', 'Grid operators balance supply and demand minute by minute.'],
              check: { q: 'When does electricity demand often peak in UAE summers?', opts: ['Early morning', 'Hot evenings, when air conditioning runs hardest', 'Midnight in winter'], a: 1, why: 'Cooling demand stays high into the evening as solar output falls.' }
            },
            {
              text: '[Energy storage], from large batteries to stored heat, shifts solar energy into the evening. Together with smarter grids and more efficient buildings, storage is what turns abundant sunshine into reliable, around-the-clock power.',
              sum: ['Energy storage moves solar energy into the evening.', 'Batteries and stored heat are two ways to do it.', 'Storage, smart grids and efficient buildings make solar reliable.'],
              check: { q: 'What does energy storage do for solar power?', opts: ['Shifts it to times when the sun isn’t shining', 'Makes panels cheaper', 'Increases sunlight'], a: 0, why: 'Storage saves daytime energy for later use.' }
            }
          ]
        }
      ],
      terms: {
        'solar irradiance': ['The power of sunlight arriving on each square metre.', 'الإشعاع الشمسي'],
        'renewable energy': ['Energy from sources that don’t run out, like sun and wind.', 'الطاقة المتجددة'],
        'carbon emissions': ['Carbon dioxide released, mainly by burning fossil fuels.', 'انبعاثات الكربون'],
        'photovoltaic': ['Turning light directly into electricity.', 'كهروضوئي'],
        'efficiency': ['The share of input energy turned into useful output.', 'الكفاءة'],
        'concentrated solar power': ['Using mirrors to focus sunlight to make heat, then electricity.', 'الطاقة الشمسية المركّزة'],
        'grid': ['The network that carries electricity from producers to users.', 'الشبكة الكهربائية'],
        'energy storage': ['Saving energy to use later, e.g. in batteries.', 'تخزين الطاقة']
      }
    }
  ];

  window.STUDIO_LIBRARY = LIB;
  window.STUDIO_DOC = LIB[0]; // the default reading
})();
