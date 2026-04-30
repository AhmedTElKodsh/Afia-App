import { memo } from 'react';

interface BottleOutlineProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const BottleOutline = memo(function BottleOutline({ className, "aria-hidden": ariaHidden }: BottleOutlineProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="280 970 815 1780"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
    >
      <g
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="7"
      >
        {/* Outer contour: cap + neck + body + handle outer */}
        <path
          d="M 783 984 L 666 981 L 613 988 L 589 1000 L 575 1026 L 574 1108 L 589 1124 L 585 1148 L 500 1211 L 444 1264 L 409 1313 L 386 1380 L 386 1431 L 411 1526 L 406 1695 L 384 1814 L 321 1993 L 299 2082 L 290 2163 L 292 2287 L 328 2485 L 390 2659 L 427 2706 L 503 2734 L 624 2741 L 777 2738 L 890 2727 L 934 2706 L 969 2666 L 1007 2571 L 1047 2448 L 1072 2325 L 1084 2100 L 1054 2038 L 1073 2027 L 1082 2002 L 1085 1829 L 1071 1630 L 1048 1494 L 1032 1445 L 1014 1428 L 998 1351 L 967 1294 L 925 1241 L 829 1152 L 826 1123 L 840 1105 L 839 1016 L 819 993 Z"
          vectorEffect="non-scaling-stroke"
        />
        {/* Handle inner aperture — D-loop only, closed path */}
        <path
          d="M 986 1543 L 995 1550 L 1000 1562 L 1009 1605 L 1017 1664 L 1020 1710 L 1024 1739 L 1024 1759 L 1029 1818 L 1029 1908 L 1026 1941 L 1021 1953 L 1012 1961 L 1004 1963 L 1002 1965 L 988 1965 L 977 1962 L 972 1968 L 969 1969 L 961 1966 L 958 1963 L 955 1963 L 954 1961 L 957 1960 L 953 1960 L 946 1953 L 941 1952 L 934 1947 L 930 1947 L 911 1936 L 893 1918 L 880 1896 L 876 1882 L 874 1859 L 874 1750 L 876 1719 L 878 1712 L 879 1693 L 886 1642 L 891 1621 L 895 1611 L 907 1594 L 931 1570 L 933 1570 L 941 1563 L 954 1556 L 958 1552 L 961 1552 L 967 1547 L 970 1547 L 976 1543 Z"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
});

export default BottleOutline;
