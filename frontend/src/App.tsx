import logo from './assets/dup-logo-colors-web_01.png'

function App() {

  return (
    <>
      <div>
        <a href="/login">
          <img src={logo} className="logo DUP max-h-100" alt="DUP logo" />
        </a>
        <div className="w-full flex justify-center items-center mt-4">
          <h1 className="text-4xl font-bold text-center">
            Digital Upskill Platform
          </h1>
          
        </div>
        <div className="w-full flex justify-center items-center text-gray-600">
        <p>
          (Click logo to login)
          </p>
        </div>
      </div>

    </>
  )
}

export default App
