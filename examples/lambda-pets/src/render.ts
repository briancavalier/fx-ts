import { Location, Pets } from './model'

export const renderError = (): string => wrapHtml(`
  <h1>Darn! We couldn't find adoptable pets for you<h1>
`)

export const renderPets = (location: Location, radiusMiles: number, pets: Pets): string => wrapHtml(`
  <h1>${pets.animals.length === 0 ? 'No adoptable' : 'Adoptable'} pets within ${radiusMiles} miles of ${location.city}</h1>
  <p>${pets.animals.filter(a => !!a.photos.length).map(a =>
  `<a href="${a.url}"><img src="${a.photos[0]?.medium}" alt="${a.name}"></a>`).join('')}
  </p>
`)

const wrapHtml = (body: string): string =>
  `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
    </head>
    <body>
      ${body}
    <footer>
      <p>Powered by <a href="https://ipstack.com">ipstack</a> and <a href="https://www.petfinder.com">petfinder</a></p>
    </footer>
    </body>
  </html>`
