import { AdoptablePets } from '../domain/model'

export const renderError = (e: Error): string => wrapHtml(`
  <h1>Darn! We couldn't find adoptable pets for you</h1>
  <p>${e.message}</p>
`)

export const renderPets = ({ location, radiusMiles, pets }: AdoptablePets): string => wrapHtml(`
  <h1>${pets.length === 0 ? 'No adoptable' : 'Adoptable'} pets within ${radiusMiles} miles of ${location.city}</h1>
  <p>${pets.filter(p => !!p.photoUrl).map(a =>
  `<a href="${a.url}"><img src="${a.photoUrl}" alt="${a.name}"></a>`).join('')}
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
