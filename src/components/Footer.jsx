export default function Footer() {
    return (
      <footer className="font-maison neue bg-rose text-center text-wine py-4 text-sm">
        <a
          href="/privacidad"
          className="underline hover:text-wineDark transition"
          target="_blank"
          rel="noopener noreferrer"
        >
          © {new Date().getFullYear()} Petit Plaisir · Todos los derechos reservados
        </a>
      </footer>
    );
  }
  