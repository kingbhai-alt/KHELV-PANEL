import { KURMA_HISTORY_20261127 } from './kurmaHistory20261127';
import { LIVE_BATCH_20261127_NIGHT } from './liveBatch20261127Night';

export interface JaiClubDrawRecord {
  period: string;
  number: number;
  size: "Big" | "Small";
  color: string;
}

const JAICLUB_HISTORY_500_BASE: JaiClubDrawRecord[] = [
  {
    "period": "20261125100020372",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020371",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020370",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020369",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020368",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020367",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020366",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020365",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020364",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020363",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020362",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020361",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020360",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020359",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020358",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020357",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020356",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020355",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020354",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020353",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020352",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020351",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020350",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020349",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020348",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020347",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020346",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020345",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020344",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020343",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020342",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020341",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020340",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020339",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020338",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020337",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020336",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020335",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020334",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020333",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020332",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020331",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020330",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020329",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020328",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020327",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020326",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020325",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020324",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020323",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020322",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020321",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020320",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020319",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020318",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020317",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020316",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020315",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020314",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020313",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020312",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020311",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020310",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020309",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020308",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020307",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020306",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020305",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020304",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020303",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020302",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020301",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020300",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020299",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020298",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020297",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020296",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020295",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020294",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020293",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020292",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020291",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020290",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020289",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020288",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020287",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020286",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020285",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020284",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020283",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020282",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020281",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020280",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020279",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020278",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020277",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020276",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020275",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020274",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020273",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020272",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020271",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020270",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020269",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020268",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020267",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020266",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020265",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020264",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020263",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020262",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020261",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020260",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020259",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020258",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020257",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020256",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020255",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020254",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020253",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020252",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020251",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020250",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020249",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020248",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020247",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020246",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020245",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020244",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020243",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020242",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020241",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020240",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020239",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020238",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020237",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020236",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020235",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020234",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020233",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020232",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020231",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020230",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020229",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020228",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020227",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020226",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020225",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020224",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020223",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020222",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020221",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020220",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020219",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020218",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020217",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020216",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020215",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020214",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020213",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020212",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020211",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020210",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020209",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020208",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020207",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020206",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020205",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020204",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020203",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020202",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020201",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020200",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020199",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020198",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020197",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020196",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020195",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020194",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020193",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020192",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020191",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020190",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020189",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020188",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020187",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020186",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020185",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020184",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020183",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020182",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020181",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020180",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020179",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020178",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020177",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020176",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020175",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020174",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020173",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020172",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020171",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020170",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020169",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020168",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020167",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020166",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020165",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020164",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020163",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020162",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020161",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020160",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020159",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020158",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020157",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020156",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020155",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020154",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020153",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020152",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020151",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020150",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020149",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020148",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020147",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020146",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020145",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020144",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020143",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020142",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020141",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020140",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020139",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020138",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020137",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020136",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020135",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020134",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020133",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020132",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020131",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020130",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020129",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020128",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020127",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020126",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020125",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020124",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020123",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020122",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020121",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020120",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020119",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020118",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020117",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020116",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020115",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020114",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020113",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020112",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020111",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020110",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020109",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020108",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020107",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020106",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020105",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020104",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020103",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020102",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020101",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020100",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020099",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020098",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020097",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020096",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020095",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020094",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020093",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020092",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020091",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020090",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020089",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020088",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020087",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020086",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020085",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020084",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020083",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020082",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020081",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020080",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020079",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020078",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020077",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020076",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020075",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020074",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020073",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020072",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020071",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020070",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020069",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020068",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020067",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020066",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020065",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020064",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020063",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020062",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020061",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020060",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020059",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020058",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020057",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020056",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020055",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020054",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020053",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020052",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020051",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020050",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020049",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020048",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020047",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020046",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020045",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020044",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020043",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020042",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020041",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020040",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020039",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020038",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020037",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020036",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020035",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020034",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020033",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020032",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020031",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020030",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020029",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020028",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020027",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020026",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020025",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020024",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020023",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020022",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020021",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020020",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020019",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020018",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020017",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020016",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261125100020015",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020014",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020013",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020012",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020011",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020010",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020009",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020008",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020007",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020006",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261125100020005",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261125100020004",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261125100020003",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261125100020002",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261125100020001",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020480",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020479",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020478",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020477",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020476",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020475",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020474",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020473",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020472",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020471",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020470",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020469",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020468",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020467",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020466",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020465",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020464",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020463",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020462",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020461",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020460",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020459",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020458",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020457",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020456",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020455",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020454",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020453",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020452",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020451",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020450",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020449",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020448",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020447",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020446",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020445",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020444",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020443",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020442",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020441",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020440",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020439",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020438",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020437",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020436",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020435",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020434",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020433",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020432",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020431",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020430",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020429",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020428",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020427",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020426",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020425",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020424",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020423",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020422",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020421",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020420",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020419",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020418",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020417",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020416",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020415",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020414",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020413",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020412",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020411",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020410",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020409",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020408",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020407",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020406",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020405",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020404",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020403",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020402",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020401",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020400",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020399",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020398",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020397",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020396",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020395",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020394",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020393",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020392",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020391",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020390",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020389",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020388",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020387",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020386",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020385",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020384",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020383",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020382",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020381",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020380",
    "number": 4,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020379",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020378",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020377",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020376",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020375",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020374",
    "number": 0,
    "size": "Small",
    "color": "Red+Violet"
  },
  {
    "period": "20261124100020373",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020372",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020371",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020370",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020369",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020368",
    "number": 9,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020367",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020366",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020365",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020364",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020363",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020362",
    "number": 1,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020361",
    "number": 5,
    "size": "Big",
    "color": "Green+Violet"
  },
  {
    "period": "20261124100020360",
    "number": 6,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020359",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020358",
    "number": 8,
    "size": "Big",
    "color": "Red"
  },
  {
    "period": "20261124100020357",
    "number": 3,
    "size": "Small",
    "color": "Green"
  },
  {
    "period": "20261124100020356",
    "number": 2,
    "size": "Small",
    "color": "Red"
  },
  {
    "period": "20261124100020355",
    "number": 7,
    "size": "Big",
    "color": "Green"
  },
  {
    "period": "20261124100020354",
    "number": 9,
    "size": "Big",
    "color": "Green"
  }
];

function mergeHistoricalBatches(
  ...batches: JaiClubDrawRecord[][]
): JaiClubDrawRecord[] {
  const byPeriod = new Map<string, JaiClubDrawRecord>();
  for (const batch of batches) {
    for (const item of batch) {
      if (item.period && !byPeriod.has(item.period)) {
        byPeriod.set(item.period, item);
      }
    }
  }
  return Array.from(byPeriod.values()).sort((a, b) => {
    try {
      const ba = BigInt(a.period.replace(/\D/g, '') || '0');
      const bb = BigInt(b.period.replace(/\D/g, '') || '0');
      return bb > ba ? 1 : bb < ba ? -1 : 0;
    } catch {
      return b.period.localeCompare(a.period);
    }
  });
}

export const JAICLUB_HISTORY_500: JaiClubDrawRecord[] = mergeHistoricalBatches(
  LIVE_BATCH_20261127_NIGHT,
  KURMA_HISTORY_20261127,
  JAICLUB_HISTORY_500_BASE
);
