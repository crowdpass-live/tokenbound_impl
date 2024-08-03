import React from 'react'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

const UpdateSection = () => {
    const updateData = [
        {
            caption: "Create Event"
        },  {
            caption: "CrowdPass"
        },  {
            caption: "Events made easy"
        }
    ]

    const settings = {
        dots: false,
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        speed: 2000,
        autoplaySpeed: 2000,
        cssEase: "linear",
        arrows: false,
    };

    const content = updateData.map(({ caption }, index) => {
        return (
            <div  key={index}>
                 <div className='flex gap-12 justify-center items-center'>
                <img src='/assets/scroling-star.png' />
                <h1 className='text-white font-semibold text-3xl 2xl:text-5xl'>{caption}</h1>
            </div>
            </div>
        )
    })
    return (
            <Slider {...settings} className='z-10 bg-deep-blue h-20 flex justify-center items-center overflow-y-hidden slider-container'>
                {content}
            </Slider>
    )
}

export default UpdateSection;