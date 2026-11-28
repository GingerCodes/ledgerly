/** Top five categories get their own colour; everything after that shares the grey one. */
export const DONUT_COLORS = ['#245c48', '#589368', '#c9a227', '#b4533f', '#5b7db1', '#b8c2bb']
export const sliceColor = (index: number) => DONUT_COLORS[Math.min(index, DONUT_COLORS.length - 1)]
