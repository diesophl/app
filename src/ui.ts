export const btn = 'rounded-full bg-berry px-6 py-3 font-bold text-blush disabled:opacity-50'
export const field = 'w-full rounded-xl border-2 border-rose bg-white px-4 py-3 text-berry'
export const card = 'rounded-2xl bg-white p-6'
export const pill = (on: boolean) =>
  'rounded-full border-2 border-berry px-4 py-2 font-bold ' + (on ? 'bg-berry text-blush' : 'text-berry')
