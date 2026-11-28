/** Chart colours come from the active palette (`--chart-1` … `--chart-6`). The first five are for the top categories; the sixth is the grey for everything else. */
export const DONUT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
export const sliceColor = (index: number) => DONUT_COLORS[Math.min(index, DONUT_COLORS.length - 1)]
