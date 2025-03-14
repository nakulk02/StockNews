import React from 'react';
import {
    Chart as ChartJS,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend
} from 'chart.js';

import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    LinearScale,
    TimeScale,
    Tooltip,
    Legend,
    CandlestickController,
    CandlestickElement
);

const CandlestickChart = ({ data }) => {
    console.log("data",data)
    const chartData = {
        datasets: [
            {
                label: 'Stock Price',
                data: data,
                color: {
                    up: 'green',
                    down: 'red',
                    unchanged: 'blue'
                }
            }
        ]
    };

    const options = {
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    tooltipFormat: 'MMM d'
                },
                ticks: {
                    color: '#1565C0'
                }
            },
            y: {
                beginAtZero: false,
                ticks: {
                    color: '#1565C0'
                }
            }
        }
    };

    return <Chart type="candlestick" data={chartData} options={options} />;
};

export default CandlestickChart;
