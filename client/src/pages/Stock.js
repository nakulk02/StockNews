import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Grid,Box, Card,CircularProgress, CardContent, Typography, Divider, Paper, Container ,Button  } from '@mui/material';
import CandlestickChart from './CandlestickChart';
import {axiosInstance} from "../axois/axiosInstance";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useNavigate } from 'react-router-dom';


export default function Stock() {
    const { stock_name } = useParams();
    const [stock, setStock] = useState();
    const [chartData, setChartData] = useState([]);
    const [stockInfo,setStockInfo]=useState("");
    const [loading,setLoading]=useState(true);
    const [errorStock,setErrorStock]=useState(false);
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate('/'); 
    };

    useEffect(() => {
        setStock(stock_name);

        const sampleData = [
            { x: '2024-03-05', o: 100, h: 110, l: 95, c: 105 },
            { x: '2024-03-06', o: 105, h: 115, l: 100, c: 110 },
            { x: '2024-03-07', o: 110, h: 120, l: 108, c: 118 },
            { x: '2024-03-08', o: 118, h: 125, l: 115, c: 120 }
        ];
        setChartData(sampleData);
        const fetchData = async () => {
          try {
              const response = await axiosInstance.get(`/api/stock_info/${stock_name}`);
              console.log(response)
              setStockInfo(response.data.news[0]);
              setLoading(false);
          } catch (error) {
              console.error('Error fetching stock data:', error);
              setLoading(false);
              setErrorStock(true);
          }
      };

      fetchData();
    }, [stock_name]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                backgroundColor: '#e3f2fd',
                padding: '20px',
                boxSizing: 'border-box',
            }}
        >
            {loading?(
              <>
              <Box
                sx={{
                    display: 'flex',
                    height: '100vh',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
            >
                <CircularProgress size={60} thickness={4.5} />
            </Box>
              </>
          ): errorStock?<>
            <Container maxWidth="sm">
            <Paper elevation={6} sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                padding: 4,
                backgroundColor: '#f8d7da',
                borderRadius: 4
            }}>
                <ErrorOutlineIcon sx={{ fontSize: 80, color: '#d32f2f', marginBottom: 2 }} />
                <Typography variant="h4" color="error" gutterBottom>
                    500 - Internal Server Error
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'center', marginBottom: 2 }}>
                    Something went wrong on our end. Please try again later.
                </Typography>
                <Box mt={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleGoBack}
                    >
                        Go Back to Home
                    </Button>
                </Box>
            </Paper>
        </Container>
            </>:
<>
<Card
                sx={{
                    backgroundColor: '#1E88E5',
                    color: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'center',
                    marginBottom: '20px',
                }}
            >
                <CardContent>
                    <Typography variant="h4" fontWeight="bold">
                        {stock || 'Loading...'}
                    </Typography>
                    <Divider sx={{ backgroundColor: '#fff', marginY: 2 }} />
                </CardContent>
            </Card>
              <Grid container spacing={2}>

            <Grid item xs={4.5}>

            <Paper
                elevation={3}
                sx={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#E3F2FD',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  height: '450px'
                }}
                >
                <Typography variant="h5" marginBottom="10px">
                    Chart
                </Typography>
                <CandlestickChart data={chartData} />
            </Paper>
              </Grid>
            <Grid item xs={7}>
            <Paper
                elevation={3}
                sx={{
                  maxHeight: '450px',
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#E3F2FD',
                  borderRadius: '12px',
                  overflowY: 'auto',
                }}
                >
                <Typography variant="h5" fontWeight="bold" marginBottom="10px">
                    Summary
                </Typography>
                <Typography variant="body1">
                  {stockInfo}
                 </Typography>
            </Paper>
              </Grid>
                </Grid>
      </>
      }
        </Box>
      );
}
