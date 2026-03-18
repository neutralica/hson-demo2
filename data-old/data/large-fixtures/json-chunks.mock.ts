// json-chunks.mock.hson-showcase.ts


export const json_CARS = `
{
  "lastUpdated": "2025-06-07T15:30:00Z",
  "dataSource": "Internal Market Analysis Group",
  "electricVehicleMarket": {
    "brands": [
      {
        "brandId": "TSLA",
        "brandName": "Tesla, Inc.",
        "countryOfOrigin": "USA",
        "stockSymbol": "TSLA",
        "models": [
          {
            "modelId": "TSLAM3",
            "modelName": "Model 3",
            "vehicleType": "Sedan",
            "productionYears": [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
            "baseMsrp": 38990,
            "trims": [
              {
                "trimId": "M3-RWD",
                "trimName": "Rear-Wheel Drive",
                "price": 38990,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 272,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 60,
                    "units": "kWh",
                    "chemistry": "LFP"
                  },
                  "motor": {
                    "drivetrain": "RWD",
                    "horsepower": 271,
                    "torque_lb_ft": 310
                  },
                  "performance": {
                    "zeroToSixtyMph": 5.8
                  }
                },
                "standardFeatures": ["18in Aero Wheels", "Glass Roof", "Autopilot", "15-inch Center Touchscreen"],
                "availablePackages": [
                  {
                    "packageId": "TSLA-EAP",
                    "packageName": "Enhanced Autopilot",
                    "packagePrice": 6000,
                    "includedOptions": ["Navigate on Autopilot", "Auto Lane Change", "Autopark", "Summon", "Smart Summon"],
                    "conflictsWith": ["TSLA-FSD"]
                  },
                  {
                    "packageId": "TSLA-FSD",
                    "packageName": "Full Self-Driving Capability",
                    "packagePrice": 12000,
                    "includedOptions": ["All functionality of Basic Autopilot and Enhanced Autopilot", "Traffic Light and Stop Sign Control", "Autosteer on city streets (Beta)"],
                    "conflictsWith": ["TSLA-EAP"]
                  }
                ]
              },
              {
                "trimId": "M3-LR",
                "trimName": "Long Range AWD",
                "price": 47740,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 333,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 82,
                    "units": "kWh",
                    "chemistry": "NCA"
                  },
                  "motor": {
                    "drivetrain": "Dual Motor AWD",
                    "horsepower": 431,
                    "torque_lb_ft": 376
                  },
                  "performance": {
                    "zeroToSixtyMph": 4.2
                  }
                },
                "standardFeatures": ["18 Aero Wheels", "Glass Roof", "Autopilot", "Premium Interior", "Heated front and rear seats"],
                "availablePackages": ["TSLA-EAP", "TSLA-FSD"]
              }
            ],
            "colorOptions": [
              { "colorName": "Pearl White Multi-Coat", "price": 0, "type": "Solid" },
              { "colorName": "Deep Blue Metallic", "price": 1000, "type": "Metallic" },
              { "colorName": "Solid Black", "price": 1500, "type": "Solid" },
              { "colorName": "Ultra Red", "price": 2000, "type": "Metallic" }
            ]
          }
        ]
      },
      {
        "brandId": "RVN",
        "brandName": "Rivian",
        "countryOfOrigin": "USA",
        "stockSymbol": "RIVN",
        "models": [
          {
            "modelId": "RVN-R1T",
            "modelName": "R1T",
            "vehicleType": "Truck",
            "productionYears": [2022, 2023, 2024, 2025],
            "baseMsrp": 73000,
            "trims": [
              {
                "trimId": "R1T-DM",
                "trimName": "Dual-Motor",
                "price": 79800,
                "isAvailable": true,
                "specs": {
                  "range": null,
                  "battery": {
                    "capacity": 135,
                    "units": "kWh",
                    "packOptions": ["Standard+", "Large", "Max"]
                  },
                  "motor": {
                    "drivetrain": "Dual Motor AWD",
                    "horsepower": 533,
                    "torque_lb_ft": 610
                  },
                  "towingCapacityLb": 11000
                },
                "standardFeatures": ["Gear Tunnel", "Air Suspension", "Driver+ Assist"],
                "availablePackages": []
              },
              {
                "trimId": "R1T-QM",
                "trimName": "Quad-Motor",
                "price": 87000,
                "isAvailable": false,
                "discontinuationNotice": "Temporarily paused for new orders; Quad-Motor configuration being redesigned.",
                "specs": {
                  "range": {
                    "epaEstimate": 328,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 135,
                    "units": "kWh",
                    "packOptions": ["Large"]
                  },
                  "motor": {
                    "drivetrain": "Quad Motor AWD",
                    "horsepower": 835,
                    "torque_lb_ft": 908
                  },
                  "performance": {
                    "zeroToSixtyMph": 3.0
                  },
                  "towingCapacityLb": 11000
                },
                "standardFeatures": ["Gear Tunnel", "Air Suspension", "Driver+ Assist", "Per-wheel torque vectoring"],
                "availablePackages": [
                  {
                    "packageId": "RVN-ADV",
                    "packageName": "Adventure Package",
                    "packagePrice": 4500,
                    "includedOptions": ["Meridian Sound System", "Perforated Vegan Leather", "Heated and Ventilated Seats", "Natural-grained ash wood interior"],
                    "conflictsWith": null
                  }
                ]
              }
            ]
          },
          {
            "modelId": "RVN-R1S",
            "modelName": "R1S",
            "vehicleType": "SUV",
            "productionYears": [2022, 2023, 2024, 2025],
            "baseMsrp": 78000,
            "trims": []
          }
        ]
      },
      {
        "brandId": "FORD",
        "brandName": "Ford Motor Company",
        "countryOfOrigin": "USA",
        "stockSymbol": "F",
        "models": [
          {
            "modelId": "FORD-MME",
            "modelName": "Mustang Mach-E",
            "vehicleType": "SUV",
            "productionYears": [2021, 2022, 2023, 2024],
            "baseMsrp": 42995,
            "trims": [
              {
                "trimId": "MME-GT",
                "trimName": "GT",
                "price": 59995,
                "isAvailable": true,
                "specs": {
                  "range": {
                    "epaEstimate": 270,
                    "units": "miles"
                  },
                  "battery": {
                    "capacity": 91,
                    "units": "kWh",
                    "notes": "Extended Range Battery is standard on GT"
                  },
                  "motor": {
                    "drivetrain": "eAWD",
                    "horsepower": 480,
                    "torque_lb_ft": 600
                  },
                  "performance": {
                    "zeroToSixtyMph": 3.8
                  }
                },
                "standardFeatures": ["20 Machined-Face Aluminum Wheels", "Unbridled Extend Drive Mode", "MagneRide Damping System"],
                "availablePackages": [
                  {
                    "packageId": "FORD-GTP",
                    "packageName": "GT Performance Edition",
                    "packagePrice": 6000,
                    "includedOptions": ["Performance Gray ActiveX Seating Material", "Fixed-position front-row head restraints", "Aluminum instrument panel"],
                    "notes": "Increases torque to 634 lb.-ft. and lowers 0-60 to 3.5s"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
`


export const json_invertebrae = `
{
  "kingdom": "Animalia",
  "invertebrates": [
    {
      "phylum": "Arthropoda",
      "characteristics": {
        "segmentedBody": true,
        "exoskeleton": true,
        "jointedAppendages": true,
        "examples": ["insects", "spiders", "crustaceans"]
      },
      "classes": [
        {
          "name": "Insecta",
          "orders": [
            {
              "name": "Lepidoptera",
              "exampleSpecies": [
                {
                  "scientificName": "Danaus plexippus",
                  "commonName": "Monarch butterfly",
                  "wingspanCm": 10.2,
                  "isPollinator": true,
                  "lifespanDays": null
                }
              ]
            },
            {
              "name": "Coleoptera",
              "exampleSpecies": [
                {
                  "scientificName": "Coccinella septempunctata",
                  "commonName": "Seven-spot ladybird",
                  "diet": ["aphids", "mites"],
                  "venomous": false
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "phylum": "Mollusca",
      "characteristics": {
        "softBody": true,
        "mantle": true,
        "shell": "variable"
      },
      "classes": [
        {
          "name": "Cephalopoda",
          "orders": [
            {
              "name": "Octopoda",
              "exampleSpecies": [
                {
                  "scientificName": "Octopus vulgaris",
                  "camouflageAbility": true,
                  "arms": 8,
                  "brainMassG": 10.0
                }
              ]
            }
          ]
        },
        {
          "name": "Gastropoda",
          "orders": [
            {
              "name": "Stylommatophora",
              "exampleSpecies": [
                {
                  "scientificName": "Cornu aspersum",
                  "commonName": "Garden snail",
                  "shellPresent": true,
                  "nocturnal": true,
                  "averageSpeedMph": 0.03
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "phylum": "Cnidaria",
      "characteristics": {
        "radialSymmetry": true,
        "nematocysts": true,
        "bodyForms": ["polyp", "medusa"]
      },
      "classes": [
        {
          "name": "Anthozoa",
          "orders": [],
          "note": "Includes corals and sea anemones, mostly sessile"
        }
      ]
    }
  ],
  "sources": [
    "https://en.wikipedia.org/wiki/Invertebrate",
    "https://animaldiversity.org"
  ],
  "extinctGroups": "null2222"
}
  `;

