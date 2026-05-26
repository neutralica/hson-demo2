

export const MOTESkf = [
    {
        name: "mote-rise",
        steps: {
            "0%": { transform: "translateY(110vh)" },
            "100%": { transform: "translateY(-15vh)" },
        },
    },
    // sway (wrapper)
    {
        name: "mote-sway",
        steps: {
            "0%": { transform: "translateX(-10px)" },
            "50%": { transform: "translateX(12px)" },
            "100%": { transform: "translateX(-8px)" },
        },
    },

    // spin (glyph)

    {
        name: "mote-spin-cw",
        steps: {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
        },
    },
    {

        name: "mote-spin-ccw",
        steps: {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(-360deg)" },
        },
    },

    {
        name: "ink-die",
        steps: {
            "0%": { opacity: "1", filter: "blur(0px)" },
            "25%": { opacity: "0.9", filter: "grayscale(0.5)" },
            "100%": { opacity: "0", filter: "grayscale(1) brightness(0.25)" },
        },
    },
    {
        name: "wrap-die",
        steps: {
            "0%": { transform: "translateY(0px)" },
            "25%": { transform: "translateY(12px)" },
            "100%": { transform: "translateY(80px)" },
        },
    },
    {
        name: "ink-die",
        steps: {
            "25%": { filter: "grayscale(0.5)" },
            "100%": { opacity: "0", filter: "grayscale(1) brightness(0.25)" },
        },
    },
    {
        name: "wrap-die",
        steps: {
            "0%": { transform: "translateY(0px)" },
            "100%": { transform: "translateY(80px)" },
        },
    }
]