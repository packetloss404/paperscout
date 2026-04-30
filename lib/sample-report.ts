import { type PDF, type ResearchLink } from '@/lib/db';

const SAMPLE_ID = 'paperscout-demo-grid-report';

export function createSampleReport(): PDF {
  const now = new Date().toISOString();
  const title = 'Demo Report: AI Data Centers and Grid Stress';

  return {
    id: SAMPLE_ID,
    title,
    fileName: 'ai-data-centers-grid-stress-demo.pdf',
    pageCount: 18,
    dateAdded: now,
    status: 'complete',
    content: sampleContent,
    chapters: [
      {
        id: 'ch-1',
        title: 'Demand Shock From AI Compute',
        content: `# Demand Shock From AI Compute

> [Analyst Take] The report argues that AI data centers are becoming a material new load category for regional power systems, especially where campuses cluster near cheap land, fiber, and transmission access.

## What This Section Says
- AI training and inference facilities can concentrate hundreds of megawatts of new demand in a small geographic footprint.
- The timing of demand matters as much as total energy use because grid operators must serve peak load, not annual averages.
- Local grid stress can appear before national electricity forecasts look alarming.

## Why It Matters
Utilities, regulators, and developers may need to plan for AI load as an industrial demand shock rather than normal commercial growth. The report suggests that slow interconnection queues could become a bottleneck for AI infrastructure.

## Evidence Worth Keeping
The document emphasizes regional clustering, interconnection delays, and the difference between nameplate capacity and actual operating load.

## Caveats and Open Questions
- The report does not prove that every announced data center will be built.
- Some workloads may shift across time or regions if power prices rise.
- The evidence is strongest for local stress, not national scarcity.

## Follow-Up Threads
- AI data center load forecasts by balancing authority
- utility interconnection queues data center load
- demand response options for AI inference workloads

## Citation and Footnote Leads
- Lawrence Berkeley National Laboratory data center energy reports
- EIA commercial electricity demand data
- NERC long-term reliability assessment data center load`,
      },
      {
        id: 'ch-2',
        title: 'Fragile Assumptions In Forecasts',
        content: `# Fragile Assumptions In Forecasts

> [Analyst Take] The forecast depends on assumptions about utilization, chip efficiency, cooling technology, power procurement, and whether inference demand grows as fast as model deployment.

## What This Section Says
- Forecasts vary widely because the industry is changing faster than utility planning cycles.
- Efficiency gains may reduce electricity per query, but total usage can still rise if demand expands faster.
- Public announcements can overstate near-term load because developers often reserve capacity before projects are final.

## Why It Matters
The report is useful as a warning signal, but it should not be read as a precise national forecast. The most useful action is to verify regional claims against utility filings and grid operator data.

## Evidence Worth Keeping
The strongest evidence is found in grid operator queue data, utility integrated resource plans, and site-specific power purchase announcements.

## Caveats and Open Questions
- Does the forecast distinguish committed projects from speculative announcements?
- Are efficiency improvements modeled as one-time gains or continuous improvements?
- Are backup generation and behind-the-meter resources included?`,
      },
      {
        id: 'ch-3',
        title: 'What To Investigate Next',
        content: `# What To Investigate Next

> [Analyst Take] The next research move is not more generic AI energy commentary. It is source chasing: utility filings, ISO queue data, water permits, and company power procurement disclosures.

## What This Section Says
- The most actionable evidence sits outside the PDF in regulatory filings and regional grid data.
- Water availability may become a hidden constraint where evaporative cooling is used.
- The report hints that data center growth could accelerate clean power procurement while also extending fossil capacity in constrained regions.

## Why It Matters
This creates a two-sided policy story: AI infrastructure may finance more clean energy, but it may also create short-term reliability and permitting pressure.

## Follow-Up Threads
- Dominion Energy data center load forecast Virginia
- PJM interconnection queue data center demand
- data center water consumption evaporative cooling arid regions
- hyperscaler power purchase agreements additionality`,
      },
    ],
    intelligence: {
      category: 'Energy and AI Infrastructure',
      executiveBrief: 'The report argues that AI data centers are emerging as a concentrated power demand shock for some regional grids. It does not claim the entire national grid is at risk, but it warns that local utility planning, interconnection queues, and transmission constraints may be stressed before national forecasts look extreme. The most important distinction is between speculative announced capacity and committed, powered projects. The report is strongest when it points to regional planning evidence and weakest when it implies smooth extrapolation from current AI demand.',
      whyItMatters: 'AI infrastructure growth is becoming a power, permitting, water, and reliability question. For a researcher, the useful next step is to chase regional evidence rather than debate broad national energy headlines.',
      keyClaims: [
        'AI data center load can create local grid stress before national electricity demand appears alarming.',
        'Announced data center capacity may overstate near-term electricity demand because not every project reaches operation.',
        'Efficiency gains in chips and cooling may not reduce total electricity use if AI demand grows faster.',
        'Utility filings and grid operator queues are stronger evidence than company press releases.',
      ],
      claimCards: [
        {
          claim: 'AI data center load can create local grid stress before national electricity demand appears alarming.',
          evidence: 'The report repeatedly distinguishes regional clustering and peak load from annual national demand totals.',
          caveat: 'The claim depends on specific regions with dense data center development and constrained transmission.',
          supportLevel: 'Medium',
          query: 'AI data center load regional grid stress utility planning',
          links: researchLinks('AI data center load regional grid stress utility planning'),
        },
        {
          claim: 'Announced data center capacity may overstate near-term electricity demand.',
          evidence: 'The report notes that developers reserve capacity and announce campuses before final financing, permits, and interconnection.',
          caveat: 'Some announced projects may be backed by firm contracts, so queue data needs project-level review.',
          supportLevel: 'Strong',
          query: 'data center announced capacity interconnection queue speculative projects',
          links: researchLinks('data center announced capacity interconnection queue speculative projects'),
        },
        {
          claim: 'Efficiency gains may not lower total AI electricity use if demand expands faster.',
          evidence: 'The report frames efficiency as a denominator improvement that can be offset by more training, inference, and product adoption.',
          caveat: 'This requires evidence about demand elasticity and utilization, which the report does not fully establish.',
          supportLevel: 'Needs verification',
          query: 'AI inference efficiency rebound effect electricity demand',
          links: researchLinks('AI inference efficiency rebound effect electricity demand'),
        },
      ],
      caveats: [
        'The report may mix speculative project announcements with committed load.',
        'Regional findings should not be generalized to every grid without utility-level evidence.',
        'The report does not fully separate training load, inference load, and conventional cloud growth.',
      ],
      entities: [
        'NERC',
        'EIA',
        'Lawrence Berkeley National Laboratory',
        'PJM',
        'Dominion Energy',
        'data center interconnection queues',
        'power purchase agreements',
        'evaporative cooling',
      ],
      citationSignals: [
        {
          label: 'LBNL data center energy use reports',
          type: 'source',
          reason: 'Best starting point for historical data center electricity estimates and methodology.',
          query: 'Lawrence Berkeley National Laboratory data center energy use report AI',
          links: researchLinks('Lawrence Berkeley National Laboratory data center energy use report AI'),
        },
        {
          label: 'NERC long-term reliability assessments',
          type: 'source',
          reason: 'Useful for checking whether grid planners are flagging data center load as a reliability factor.',
          query: 'NERC long term reliability assessment data center load forecast',
          links: researchLinks('NERC long term reliability assessment data center load forecast'),
        },
        {
          label: 'PJM interconnection queue and load forecast',
          type: 'dataset',
          reason: 'A regional queue can test whether the report is making a local or national claim.',
          query: 'PJM data center load forecast interconnection queue',
          links: researchLinks('PJM data center load forecast interconnection queue'),
        },
      ],
      researchTrails: [
        {
          title: 'Check regional utility filings',
          reason: 'Utility integrated resource plans can confirm whether data centers are changing actual resource planning.',
          query: 'utility integrated resource plan data center load forecast',
          links: researchLinks('utility integrated resource plan data center load forecast'),
        },
        {
          title: 'Separate committed load from announced campuses',
          reason: 'This is the biggest source of possible overstatement in the report.',
          query: 'data center committed load versus announced capacity',
          links: researchLinks('data center committed load versus announced capacity'),
        },
        {
          title: 'Investigate water as a hidden constraint',
          reason: 'Cooling choices can turn an electricity story into a water permitting story.',
          query: 'AI data center water consumption evaporative cooling permitting',
          links: researchLinks('AI data center water consumption evaporative cooling permitting'),
        },
      ],
      skepticMode: [
        {
          label: 'Does the report separate speculative and committed projects?',
          type: 'missingEvidence',
          reason: 'If speculative announcements are counted as near-term load, the demand shock may be overstated.',
          query: 'data center announced capacity committed load interconnection queue',
          links: researchLinks('data center announced capacity committed load interconnection queue'),
        },
        {
          label: 'Are AI workloads separated from ordinary cloud growth?',
          type: 'verification',
          reason: 'Some electricity growth may come from conventional cloud services, not AI specifically.',
          query: 'AI data center electricity demand versus cloud computing growth',
          links: researchLinks('AI data center electricity demand versus cloud computing growth'),
        },
        {
          label: 'Could efficiency gains bend the curve?',
          type: 'dissent',
          reason: 'A technical optimist may argue that chip and cooling efficiency reduce the forecasted load problem.',
          query: 'AI chip efficiency electricity demand data centers rebound effect',
          links: researchLinks('AI chip efficiency electricity demand data centers rebound effect'),
        },
      ],
      weirdFindings: [
        {
          label: 'The grid risk is local before it is national',
          type: 'Buried caveat',
          reason: 'The most interesting claim is not that AI breaks the grid, but that specific regions can become constrained first.',
          query: 'regional data center load grid constraint local electricity demand',
          links: researchLinks('regional data center load grid constraint local electricity demand'),
        },
        {
          label: 'Water permits may reveal AI infrastructure pressure earlier than energy headlines',
          type: 'Rabbit hole',
          reason: 'Cooling water constraints can surface before electricity demand becomes visible in national data.',
          query: 'data center water permit AI cooling demand',
          links: researchLinks('data center water permit AI cooling demand'),
        },
      ],
    },
    scoutBoard: [
      {
        id: 'demo-board-1',
        kind: 'claim',
        title: 'AI data center load can create local grid stress before national demand appears alarming.',
        detail: 'Verify this against regional utility filings and grid operator forecasts, not just national electricity totals.',
        status: 'To verify',
        links: researchLinks('AI data center load regional grid stress utility planning'),
        createdAt: now,
      },
      {
        id: 'demo-board-2',
        kind: 'citation',
        title: 'NERC long-term reliability assessments',
        detail: 'Check whether reliability planners are explicitly flagging data center load in constrained regions.',
        status: 'Read next',
        links: researchLinks('NERC long term reliability assessment data center load forecast'),
        createdAt: now,
      },
    ],
  };
}

const sampleContent = `Demo source text for a synthetic PaperScout report about AI data centers and grid stress.

The report argues that AI data centers can create local grid pressure before national electricity demand appears alarming. It distinguishes regional clustering from national averages and warns that utility planning cycles may move more slowly than AI infrastructure buildout.

The report also warns that announced data center capacity should not be treated as committed demand. Developers may reserve power, announce campuses, or enter interconnection queues before projects receive final permits, financing, or customers.

The report highlights fragile assumptions around utilization, inference growth, chip efficiency, cooling systems, and power procurement. It recommends checking utility filings, grid operator queues, water permits, and power purchase agreements.`;

function researchLinks(query: string): ResearchLink[] {
  const encoded = encodeURIComponent(query);

  return [
    {
      label: 'Google Scholar',
      source: 'Scholar',
      url: `https://scholar.google.com/scholar?q=${encoded}`,
    },
    {
      label: 'Semantic Scholar',
      source: 'Papers',
      url: `https://www.semanticscholar.org/search?q=${encoded}&sort=relevance`,
    },
    {
      label: 'OpenAlex',
      source: 'Open research graph',
      url: `https://openalex.org/works?page=1&filter=default.search:${encoded}`,
    },
    {
      label: 'Web search',
      source: 'Broader web',
      url: `https://www.google.com/search?q=${encoded}`,
    },
  ];
}
