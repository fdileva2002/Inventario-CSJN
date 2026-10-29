import { CssBaseline, ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material';
import AppRouter from './router/AppRouter';

const base = createTheme();

// Ajustes globales para pantallas chicas, así cada página no tiene que repetirlos.
const theme = responsiveFontSizes(
  createTheme({
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            // Una tabla dentro de un Paper se desplaza horizontalmente en lugar de
            // desbordar la página, y en pantallas chicas no se aplasta.
            '&:has(> .MuiTable-root)': { overflowX: 'auto' },
            [base.breakpoints.down('md')]: {
              '& > .MuiTable-root': { minWidth: 640 },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            [base.breakpoints.down('sm')]: {
              margin: base.spacing(1),
              width: `calc(100% - ${base.spacing(2)})`,
              maxHeight: `calc(100% - ${base.spacing(2)})`,
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            [base.breakpoints.down('sm')]: {
              paddingLeft: base.spacing(2),
              paddingRight: base.spacing(2),
              '& .MuiTable-root': { minWidth: 520 },
            },
          },
        },
      },
    },
  }),
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
