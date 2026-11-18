import type { Meta, StoryObj } from "@storybook/react-vite";

function Introduction() {
  return <article className="storybook-introduction">
    <header>
      <h1>Catálogo de componentes de TTRPG Effects</h1>
      <p>Referencia ejecutable de la interfaz React vigente. Usa datos sintéticos y no inicia sesión, API ni motores de mapa o dados.</p>
    </header>
    <section>
      <h2>Cómo encontrar y reutilizar</h2>
      <ul>
        <li><strong>Controles</strong> reúne piezas con API propia o patrones nativos ya usados por producción.</li>
        <li><strong>Composiciones</strong> muestra cómo los componentes se agrupan sin montar <code>App</code> ni <code>ServiceApp</code>.</li>
        <li>Cada historia indica la ruta fuente, consumidor y límites reales; una demo no certifica accesibilidad completa ni paridad de plataforma.</li>
      </ul>
    </section>
    <section>
      <h2>Contexto y accesibilidad</h2>
      <ul>
        <li>El decorador carga los estilos de producción y ofrece contextos neutral, editor, service y workspace.</li>
        <li>El cliente es explícitamente nulo y los portales se crean dentro del iframe de la historia.</li>
        <li>Comprueba teclado, foco visible, etiquetas y texto largo a 390 px y 1440 px antes de adoptar un patrón.</li>
      </ul>
    </section>
    <nav aria-label="Atajos del catálogo">
      <a href="./?path=/docs/controles-button--docs" target="_top">Documentación de Button</a>
      <a href="./?path=/story/controles-sharedswitch--default" target="_top">Probar SharedSwitch</a>
    </nav>
  </article>;
}

const meta = {
  title: "Fundamentos/Introducción",
  component: Introduction,
  parameters: {
    layout: "fullscreen",
    uiContext: "neutral",
    docs: {
      description: {
        component: "Punto de entrada del catálogo. Fuentes, cobertura y exclusiones se mantienen en `SDD/specs/60-storybook-componentes-ui/inventario.md`."
      }
    }
  }
} satisfies Meta<typeof Introduction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalogo: Story = {};
