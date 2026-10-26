/* ERLY Reading Studio — the sample reading and the study buddy's prepared
   help for each paragraph (plain-words summary, key terms, a friendly check).
   In the product these are generated on-device; in the demo they are written
   in advance so nothing is invented at runtime. */
window.STUDIO_DOC = {
  title: 'MECH210_Week4_Reading.pdf',
  course: 'MECH 210 · Thermodynamics I',
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
      ],
      fig: {
        cap: 'Figure 4.3 — A control volume around a steam turbine. Mass and energy cross the dashed boundary.',
        steps: ['The dashed box is the control volume — the part we are studying.', 'Fluid enters on the left, carrying its mass and enthalpy (m, h in).', 'Work W leaves through the turbine shaft.', 'Fluid leaves on the right with less enthalpy (m, h out). The drop became work.']
      }
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
};
